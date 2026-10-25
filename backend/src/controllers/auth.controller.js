const crypto = require('crypto');
const { Op } = require('sequelize');
const { Usuario, Seccion, Categoria, UsuarioCodigoRecuperacion, sequelize } = require('../models');
const { comprimirPermisos } = require('../utils/permisosToken');
const { verifyPassword, hashPassword, isPasswordValid } = require('../utils/password.utils');
const { signToken, DURACION_SESION_SEG } = require('../utils/jwt.utils');
const { ponerCookieSesion, borrarCookieSesion, ponerCookie2fa, borrarCookie2fa } = require('../utils/sesionCookie');
const aes = require('../utils/aesCrypto');
const totp = require('../utils/totp');
const { enviarEmail, mailConfigurado } = require('../utils/mailer');

const includeAuth = [
  { model: Seccion, as: 'secciones', attributes: ['id', 'clave', 'nombre'], through: { attributes: ['puede_ver', 'puede_editar'] } },
  // Nombre de la categoría del usuario (para que el frontend pueda, p. ej.,
  // enseñar las Estadísticas solo al entrenador de Senior A).
  { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'], required: false }
];

function userPayload(user) {
  const permisos = {};
  (user.secciones || []).forEach((s) => {
    permisos[s.clave] = {
      ver: !!s.usuario_secciones?.puede_ver,
      editar: !!s.usuario_secciones?.puede_editar
    };
  });
  const secciones = Object.keys(permisos);
  return {
    id: user.id,
    usuario: user.usuario,
    nombre: user.nombre,
    apellidos: user.apellidos,
    secciones,
    permisos,
    rol: user.rol,
    id_categoria: user.id_categoria || null,
    categoria_nombre: user.categoria?.nombre || null
  };
}

const ahoraSeg = () => Math.floor(Date.now() / 1000);

// Bloqueo de cuenta por fuerza bruta: tras MAX_INTENTOS fallos de contraseña
// consecutivos, la cuenta queda bloqueada BLOQUEO_MIN minutos (se levanta sola).
const MAX_INTENTOS = 5;
const BLOQUEO_MIN = 15;

/** Token de sesión con los permisos del usuario en este momento. `inicio` es
 * cuándo se inició sesión (segundos): renovar el token en /auth/me no alarga
 * la sesión, que caduca como máximo 1 hora después de entrar. */
function tokenPara(user, payload, inicio = ahoraSeg()) {
  return signToken({
    id: user.id,
    usuario: user.usuario,
    // Compactos: el token va en una cookie (ver utils/permisosToken.js).
    ...comprimirPermisos(payload.permisos),
    rol: payload.rol,
    id_categoria: payload.id_categoria,
    ini: inicio,
    exp: inicio + DURACION_SESION_SEG
  });
}

// ---- Segundo factor (2FA) ----
// El token temporal entre "contraseña correcta" y "segundo factor": NO da
// acceso, solo permite completar el 2FA. Caduca pronto (10 min).
const CADUCIDAD_2FA_SEG = 10 * 60;

function tokenPendiente2fa(datos) {
  const ini = ahoraSeg();
  return signToken({ tipo: '2fa', ...datos, ini, exp: ini + CADUCIDAD_2FA_SEG });
}

/** Emite la cookie de sesión definitiva y devuelve el payload del usuario
 * (recarga permisos y relaciones del momento). */
async function emitirSesion(res, userId) {
  const user = await Usuario.findByPk(userId, { include: includeAuth });
  const payload = userPayload(user);
  ponerCookieSesion(res, tokenPara(user, payload));
  return payload;
}

/** Comprueba un código de recuperación (un solo uso) y lo marca como usado. */
async function consumirCodigoRecuperacion(idUsuario, codigo) {
  const norm = totp.normalizarCodigo(codigo);
  if (norm.length < 8) return false;
  const codigos = await UsuarioCodigoRecuperacion.findAll({
    where: { id_usuario: idUsuario, usado: false }
  });
  for (const c of codigos) {
    if (await verifyPassword(norm, c.codigo_hash)) {
      await c.update({ usado: true });
      return true;
    }
  }
  return false;
}

async function login(req, res, next) {
  try {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
      return res.status(400).json({ message: 'Usuario y contraseña son obligatorios.' });
    }
    // Un objeto/array aquí acabaría en el WHERE de Sequelize y en un 500.
    if (typeof usuario !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Usuario y contraseña deben ser texto.' });
    }

    const user = await Usuario.scope('withPassword').findOne({
      where: { usuario },
      include: includeAuth
    });

    const credencialesInvalidas = () =>
      res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });

    if (!user || !user.activo) return credencialesInvalidas();

    // Cuenta bloqueada temporalmente por intentos fallidos.
    if (user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date()) {
      return res.status(429).json({
        message: 'Cuenta bloqueada temporalmente por varios intentos fallidos. Inténtalo de nuevo en unos minutos.'
      });
    }

    const passwordOk = await verifyPassword(password, user.password);
    if (!passwordOk) {
      // Cuenta el fallo y, al llegar al límite, bloquea la cuenta un rato.
      const intentos = (user.intentos_fallidos || 0) + 1;
      if (intentos >= MAX_INTENTOS) {
        await user.update({
          intentos_fallidos: 0,
          bloqueado_hasta: new Date(Date.now() + BLOQUEO_MIN * 60 * 1000)
        });
      } else {
        await user.update({ intentos_fallidos: intentos });
      }
      return credencialesInvalidas();
    }

    // Contraseña correcta: reinicia el contador y el bloqueo si los había.
    if (user.intentos_fallidos || user.bloqueado_hasta) {
      await user.update({ intentos_fallidos: 0, bloqueado_hasta: null });
    }

    // El 2FA es obligatorio: el login nunca da sesión directa. Si el usuario ya
    // tiene el segundo factor, se le pide el código; si no, se le fuerza a
    // configurarlo. La sesión solo se emite al superar el 2FA (ver más abajo).
    borrarCookieSesion(res);
    const yaTiene2fa = user.totp_activado && user.totp_secret;
    const fase = yaTiene2fa ? 'verificar' : 'configurar';
    ponerCookie2fa(res, tokenPendiente2fa({ fase, id: user.id, usuario: user.usuario }));
    return res.json({ twofa: fase, nombre: user.nombre });
  } catch (err) {
    return next(err);
  }
}

/** Paso 2 (ya tiene 2FA): verifica el código TOTP o un código de recuperación
 * y, si es correcto, emite la sesión. Usa la cookie temporal `apr_2fa`. */
async function verificar2fa(req, res, next) {
  try {
    const { id } = req.pendiente2fa;
    const codigo = String((req.body && req.body.codigo) || '').trim();
    if (!codigo) return res.status(400).json({ message: 'Escribe el código.' });

    const user = await Usuario.scope('withPassword').findByPk(id);
    if (!user || !user.activo || !user.totp_activado || !user.totp_secret) {
      return res.status(401).json({ message: 'No se puede verificar. Vuelve a iniciar sesión.' });
    }

    let ok = false;
    const soloDigitos = codigo.replace(/\s+/g, '');
    if (/^\d{6}$/.test(soloDigitos)) {
      ok = totp.verificarToken(soloDigitos, aes.decrypt(user.totp_secret));
    }
    if (!ok) ok = await consumirCodigoRecuperacion(user.id, codigo);
    if (!ok) return res.status(401).json({ message: 'Código incorrecto.' });

    borrarCookie2fa(res);
    const payload = await emitirSesion(res, user.id);
    return res.json({ user: payload });
  } catch (err) {
    return next(err);
  }
}

/** Paso 2a (no tiene 2FA): genera un secreto nuevo y devuelve el QR para
 * escanearlo. El secreto va en la cookie temporal (aún no se guarda en BD). */
async function enrolar2faInicio(req, res, next) {
  try {
    const { id, usuario } = req.pendiente2fa;
    const user = await Usuario.findByPk(id);
    if (!user || !user.activo) {
      return res.status(401).json({ message: 'No se puede continuar. Vuelve a iniciar sesión.' });
    }
    const secret = totp.generarSecreto();
    const otpauth = totp.construirOtpauth(usuario, secret);
    const qr = await totp.qrDataUrl(otpauth);
    ponerCookie2fa(res, tokenPendiente2fa({ fase: 'configurar', id, usuario, secret }));
    return res.json({ qr, secret, otpauth });
  } catch (err) {
    return next(err);
  }
}

/** Paso 2b (no tiene 2FA): confirma con un código el secreto recién generado,
 * lo guarda cifrado, activa el 2FA, crea los códigos de recuperación (se
 * devuelven una sola vez) y emite la sesión. */
async function enrolar2faConfirmar(req, res, next) {
  try {
    const { id, secret } = req.pendiente2fa;
    if (!secret) {
      return res.status(400).json({ message: 'Primero escanea el código QR.' });
    }
    const codigo = String((req.body && req.body.codigo) || '').replace(/\s+/g, '');
    if (!totp.verificarToken(codigo, secret)) {
      return res.status(400).json({ message: 'El código no es correcto. Revisa la hora del móvil e inténtalo de nuevo.' });
    }
    const user = await Usuario.findByPk(id);
    if (!user || !user.activo) {
      return res.status(401).json({ message: 'No se puede continuar. Vuelve a iniciar sesión.' });
    }

    const codigos = totp.generarCodigosRecuperacion();
    const filas = await Promise.all(codigos.map(async (c) => ({
      id_usuario: id,
      codigo_hash: await hashPassword(totp.normalizarCodigo(c))
    })));
    await sequelize.transaction(async (t) => {
      await user.update({ totp_secret: aes.encrypt(secret), totp_activado: true }, { transaction: t });
      await UsuarioCodigoRecuperacion.destroy({ where: { id_usuario: id }, transaction: t });
      await UsuarioCodigoRecuperacion.bulkCreate(filas, { transaction: t });
    });

    borrarCookie2fa(res);
    const payload = await emitirSesion(res, id);
    return res.json({ user: payload, codigos_recuperacion: codigos });
  } catch (err) {
    return next(err);
  }
}

/** Datos del usuario y un token renovado: el token guarda los permisos del
 * momento del login, así que sin renovarlo un cambio de permisos (o de
 * secciones) no llegaría al backend hasta volver a iniciar sesión. */
async function me(req, res, next) {
  try {
    const user = await Usuario.findByPk(req.user.id, { include: includeAuth });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
    if (user.activo === false || user.activo === 0) return res.status(401).json({ message: 'Usuario desactivado.' });
    const payload = userPayload(user);
    // Tokens de antes de `ini`: cuenta desde que se emitieron.
    const inicio = Number(req.user.ini || req.user.iat) || ahoraSeg();
    ponerCookieSesion(res, tokenPara(user, payload, Math.min(inicio, ahoraSeg())));
    return res.json(payload);
  } catch (err) {
    return next(err);
  }
}

/** Cierra la sesión borrando la cookie (no exige estar autenticado). */
function logout(req, res) {
  borrarCookieSesion(res);
  return res.json({ message: 'Sesión cerrada.' });
}

/** Cualquier usuario cambia su propia contraseña: la actual y la nueva dos
 * veces. Tras cambiarla se borra la cookie: tiene que volver a iniciar sesión.
 * La contraseña actual incorrecta da 400 (no 401: el frontend cerraría la
 * sesión). */
async function cambiarPassword(req, res, next) {
  try {
    const { password_actual: actual, password, confirmacion } = req.body || {};
    if (typeof actual !== 'string' || !actual) {
      return res.status(400).json({ message: 'Escribe tu contraseña actual.' });
    }
    if (typeof password !== 'string' || typeof confirmacion !== 'string' || !password) {
      return res.status(400).json({ message: 'Escribe la nueva contraseña dos veces.' });
    }
    if (password !== confirmacion) {
      return res.status(400).json({ message: 'Las dos contraseñas no coinciden.' });
    }
    if (!isPasswordValid(password)) {
      return res.status(400).json({
        message: 'La contraseña debe tener mínimo 8 caracteres, una minúscula, una mayúscula, un número y un símbolo.'
      });
    }
    if (password === actual) {
      return res.status(400).json({ message: 'La nueva contraseña debe ser distinta de la actual.' });
    }
    const user = await Usuario.scope('withPassword').findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
    if (!(await verifyPassword(actual, user.password))) {
      return res.status(400).json({ message: 'La contraseña actual no es correcta.' });
    }
    await user.update({ password: await hashPassword(password) });
    borrarCookieSesion(res);
    return res.json({ message: 'Contraseña cambiada. Vuelve a iniciar sesión.' });
  } catch (err) {
    return next(err);
  }
}

// ---- Restablecer contraseña por email ----
// El enlace del email lleva un token aleatorio; en BD se guarda solo su hash
// SHA-256 y una caducidad corta. El token es de un solo uso. Restablecer la
// contraseña NO inicia sesión: el usuario sigue necesitando su 2FA al entrar.
const RESET_CADUCIDAD_MIN = 60; // el enlace caduca en 1 hora
const RESET_URL_RUTA = '/restablecer-password';

/** Respuesta genérica de "recuperar": igual exista o no la cuenta, para no
 * revelar si un usuario/email está registrado (evita enumeración de cuentas). */
const RESPUESTA_RECUPERAR = {
  message: 'Si los datos corresponden a una cuenta con email, te hemos enviado un enlace para restablecer la contraseña.'
};

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** URL base de la intranet para construir el enlace del email. */
function baseUrlApp() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const primerCors = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean)[0];
  if (primerCors) return primerCors.replace(/\/$/, '');
  return 'https://intranet.atleticopalmadelrio.com';
}

function emailRecuperacionHtml(nombre, enlace) {
  const escudo = `${baseUrlApp()}/escudo-firma.png`;
  return (
    `<div style="font-family:Arial,Helvetica,sans-serif;color:#333;max-width:520px;margin:0 auto;">` +
    `<div style="text-align:center;margin-bottom:16px;"><img src="${escudo}" width="60" height="68" alt="Atlético Palma del Río" style="border:0;"></div>` +
    `<h2 style="color:#0B3D2E;font-size:18px;margin:0 0 12px;">Restablecer tu contraseña</h2>` +
    `<p style="margin:0 0 12px;">Hola${nombre ? ` ${nombre}` : ''}:</p>` +
    `<p style="margin:0 0 16px;">Has pedido restablecer la contraseña de la intranet del Atlético Palma del Río. ` +
    `Pulsa el botón para elegir una nueva (el enlace caduca en ${RESET_CADUCIDAD_MIN} minutos):</p>` +
    `<p style="text-align:center;margin:0 0 20px;"><a href="${enlace}" style="background:#0B3D2E;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block;font-weight:bold;">Restablecer contraseña</a></p>` +
    `<p style="margin:0 0 8px;font-size:13px;color:#777;">Si el botón no funciona, copia este enlace en tu navegador:</p>` +
    `<p style="margin:0 0 16px;font-size:12px;word-break:break-all;"><a href="${enlace}" style="color:#0B3D2E;">${enlace}</a></p>` +
    `<p style="margin:0;font-size:13px;color:#777;">Si no has sido tú, ignora este correo: tu contraseña no cambiará.</p>` +
    `</div>`
  );
}

function emailRecuperacionTexto(nombre, enlace) {
  return (
    `Hola${nombre ? ` ${nombre}` : ''}:\n\n` +
    `Has pedido restablecer la contraseña de la intranet del Atlético Palma del Río.\n` +
    `Abre este enlace para elegir una nueva (caduca en ${RESET_CADUCIDAD_MIN} minutos):\n\n${enlace}\n\n` +
    `Si no has sido tú, ignora este correo: tu contraseña no cambiará.`
  );
}

/** Paso 1: el usuario pide el enlace. Responde siempre igual (sin enumeración);
 * solo envía el email si existe una cuenta activa con email y SMTP configurado. */
async function recuperarPassword(req, res, next) {
  try {
    const identificador = String((req.body && req.body.identificador) || '').trim();
    if (!identificador) return res.status(400).json({ message: 'Escribe tu usuario o tu email.' });

    const user = await Usuario.scope('withPassword').findOne({
      where: { [Op.or]: [{ usuario: identificador }, { email: identificador }] }
    });

    if (user && user.activo && user.email) {
      if (await mailConfigurado()) {
        const token = crypto.randomBytes(32).toString('hex');
        await user.update({
          reset_token: hashToken(token),
          reset_expira: new Date(Date.now() + RESET_CADUCIDAD_MIN * 60 * 1000)
        });
        const enlace = `${baseUrlApp()}${RESET_URL_RUTA}?token=${token}`;
        try {
          await enviarEmail({
            to: user.email,
            subject: 'Restablecer tu contraseña — Atlético Palma del Río',
            html: emailRecuperacionHtml(user.nombre, enlace),
            text: emailRecuperacionTexto(user.nombre, enlace)
          });
        } catch (err) {
          // No se revela el fallo al cliente (misma respuesta genérica); se registra.
          console.error('Recuperar contraseña: error enviando el email:', err.message);
        }
      } else {
        console.warn('Recuperar contraseña: no hay correo configurado; no se envía el email.');
      }
    }

    return res.json(RESPUESTA_RECUPERAR);
  } catch (err) {
    return next(err);
  }
}

/** Comprueba si un token de restablecimiento es válido (para la pantalla). */
async function validarTokenReset(req, res, next) {
  try {
    const token = String((req.query && req.query.token) || '').trim();
    if (!token) return res.json({ valido: false });
    const user = await Usuario.scope('withPassword').findOne({ where: { reset_token: hashToken(token) } });
    const valido = !!(user && user.activo && user.reset_expira && new Date(user.reset_expira) >= new Date());
    return res.json({ valido });
  } catch (err) {
    return next(err);
  }
}

/** Paso 2: con un token válido, fija la nueva contraseña. No inicia sesión. */
async function restablecerPassword(req, res, next) {
  try {
    const token = String((req.body && req.body.token) || '').trim();
    const { password, confirmacion } = req.body || {};
    if (!token) return res.status(400).json({ message: 'Falta el enlace de restablecimiento. Usa el del email.' });
    if (typeof password !== 'string' || typeof confirmacion !== 'string' || !password) {
      return res.status(400).json({ message: 'Escribe la nueva contraseña dos veces.' });
    }
    if (password !== confirmacion) {
      return res.status(400).json({ message: 'Las dos contraseñas no coinciden.' });
    }
    if (!isPasswordValid(password)) {
      return res.status(400).json({
        message: 'La contraseña debe tener mínimo 8 caracteres, una minúscula, una mayúscula, un número y un símbolo.'
      });
    }

    const user = await Usuario.scope('withPassword').findOne({ where: { reset_token: hashToken(token) } });
    if (!user || !user.activo || !user.reset_expira || new Date(user.reset_expira) < new Date()) {
      return res.status(400).json({ message: 'El enlace no es válido o ha caducado. Solicita uno nuevo.' });
    }

    await user.update({
      password: await hashPassword(password),
      reset_token: null,
      reset_expira: null,
      // Al recuperar la contraseña se levanta el bloqueo por intentos fallidos.
      intentos_fallidos: 0,
      bloqueado_hasta: null
    });
    return res.json({ message: 'Contraseña restablecida. Ya puedes iniciar sesión.' });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  login,
  verificar2fa,
  enrolar2faInicio,
  enrolar2faConfirmar,
  me,
  logout,
  cambiarPassword,
  recuperarPassword,
  validarTokenReset,
  restablecerPassword
};
