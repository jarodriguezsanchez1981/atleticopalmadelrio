const { Usuario, Seccion, Categoria } = require('../models');
const { comprimirPermisos } = require('../utils/permisosToken');
const { verifyPassword, hashPassword, isPasswordValid } = require('../utils/password.utils');
const { signToken, DURACION_SESION_SEG } = require('../utils/jwt.utils');
const { ponerCookieSesion, borrarCookieSesion } = require('../utils/sesionCookie');

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

    const passwordOk = await verifyPassword(password, user.password);
    if (!passwordOk) return credencialesInvalidas();

    const payload = userPayload(user);
    // El token va solo en la cookie HttpOnly: el JavaScript de la página no lo ve.
    ponerCookieSesion(res, tokenPara(user, payload));

    return res.json({ user: payload });
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

module.exports = { login, me, logout, cambiarPassword };
