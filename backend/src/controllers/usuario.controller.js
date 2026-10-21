const { Usuario, Seccion, UsuarioSeccion, UsuarioCodigoRecuperacion, sequelize } = require('../models');
const { isPasswordValid, hashPassword } = require('../utils/password.utils');
const aes = require('../utils/aesCrypto');

const includeUsuario = [
  { model: Seccion, as: 'secciones', attributes: ['id', 'clave', 'nombre', 'icono', 'orden'], through: { attributes: ['puede_ver', 'puede_editar'] } }
];

// Campos de la configuración de correo del usuario (buzón propio).
const CAMPOS_EMAIL_TEXTO = ['email', 'email_imap', 'email_pop3', 'email_smtp', 'email_usuario'];
const CAMPOS_EMAIL_PUERTO = ['email_imap_puerto', 'email_pop3_puerto', 'email_smtp_puerto'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** ¿Trae el cuerpo un email con formato no válido? (vacío o ausente = válido). */
function emailInvalido(body) {
  if (body.email === undefined) return false;
  const v = String(body.email ?? '').trim();
  return v !== '' && !EMAIL_RE.test(v);
}

/**
 * Extrae del cuerpo solo los campos de correo que llegan, normalizados:
 * los de texto se recortan (vacío -> null), los puertos se pasan a entero
 * positivo (vacío/no válido -> null) y la contraseña del buzón se CIFRA con AES.
 * Una contraseña vacía o ausente no se toca (igual que la de acceso): deja la
 * que hubiera. Así se puede reutilizar tanto en crear como en actualizar.
 */
function camposEmailDesdeBody(body) {
  const campos = {};
  for (const c of CAMPOS_EMAIL_TEXTO) {
    if (body[c] !== undefined) {
      const v = String(body[c] ?? '').trim();
      campos[c] = v === '' ? null : v;
    }
  }
  for (const c of CAMPOS_EMAIL_PUERTO) {
    if (body[c] !== undefined) {
      if (body[c] === '' || body[c] === null) campos[c] = null;
      else {
        const n = Number(body[c]);
        campos[c] = Number.isInteger(n) && n > 0 ? n : null;
      }
    }
  }
  if (body.email_password !== undefined && String(body.email_password).trim() !== '') {
    campos.email_password = aes.encrypt(String(body.email_password));
  }
  return campos;
}

/**
 * Normaliza los permisos recibidos del formulario a un objeto { id_seccion: {ver, editar} }.
 * El formulario de Usuarios envía `permisos` con las secciones identificadas por su
 * `clave` (texto, ej. "calendario"), no por su id numérico, así que hay que resolverlas
 * contra la tabla `secciones` antes de guardar (si no, `Number(clave)` da NaN y se
 * pierden todos los permisos al editar).
 */
async function normalizePermisos(body) {
  let entradas = null;
  if (body.permisos && typeof body.permisos === 'object') {
    entradas = Object.entries(body.permisos).map(([clave, p]) => ({ clave, ver: !!p?.ver, editar: !!p?.editar }));
  } else if (Array.isArray(body.ids_secciones)) {
    entradas = body.ids_secciones.map((id) => ({ clave: id, ver: true, editar: false }));
  } else if (Array.isArray(body.secciones)) {
    entradas = body.secciones.map((s) => ({ clave: typeof s === 'object' ? s.id : s, ver: true, editar: false }));
  }
  if (!entradas) return null;
  if (!entradas.length) return {};

  const clavesTexto = [...new Set(entradas.filter((e) => Number.isNaN(Number(e.clave))).map((e) => e.clave))];
  const mapaClaveId = new Map();
  if (clavesTexto.length) {
    const filas = await Seccion.findAll({ where: { clave: clavesTexto }, attributes: ['id', 'clave'] });
    filas.forEach((f) => mapaClaveId.set(f.clave, f.id));
  }

  const permisos = {};
  entradas.forEach((e) => {
    const id = Number.isNaN(Number(e.clave)) ? mapaClaveId.get(e.clave) : Number(e.clave);
    if (!id) return;
    permisos[id] = { ver: e.ver, editar: e.editar };
  });
  return permisos;
}

/**
 * Sustituye las filas de usuario_secciones de un usuario por las indicadas en `permisos`
 * ({ id_seccion: {ver, editar} }). Se maneja la tabla intermedia directamente (en vez de
 * `usuario.setSecciones(...)`) porque el helper de asociación de Sequelize no admite
 * datos de la tabla intermedia distintos por fila en una sola llamada.
 */
async function guardarPermisosUsuario(idUsuario, permisos) {
  await UsuarioSeccion.destroy({ where: { id_usuario: idUsuario } });
  const idsSecciones = Object.keys(permisos || {}).map(Number).filter(Boolean);
  if (!idsSecciones.length) return;
  await UsuarioSeccion.bulkCreate(idsSecciones.map((id) => ({
    id_usuario: idUsuario,
    id_seccion: id,
    puede_ver: permisos[id]?.ver ? 1 : 0,
    puede_editar: permisos[id]?.editar ? 1 : 0
  })));
}

async function listar(req, res, next) {
  try {
    const usuarios = await Usuario.findAll({
      include: includeUsuario,
      order: [['id', 'ASC']]
    });
    res.json(usuarios.map((u) => serializeUsuario(u)));
  } catch (err) { next(err); }
}

function serializeUsuario(usuario) {
  const json = usuario.toJSON ? usuario.toJSON() : usuario;
  // Ni el hash de acceso ni la contraseña (cifrada) del buzón salen nunca.
  const { password, email_password, ...safe } = json;
  safe.permisos = {};
  (safe.secciones || []).forEach((s) => {
    safe.permisos[s.clave] = {
      ver: !!s.usuario_secciones?.puede_ver,
      editar: !!s.usuario_secciones?.puede_editar
    };
  });
  return safe;
}

async function obtener(req, res, next) {
  try {
    const usuario = await Usuario.findByPk(req.params.id, { include: includeUsuario });
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado.' });
    res.json(serializeUsuario(usuario));
  } catch (err) { next(err); }
}

function rolFinal(rol) {
  return rol === 'entrenador' ? 'entrenador' : 'coordinador';
}

function validaRolCategoria(res, rol, id_categoria) {
  const rolNormalizado = rolFinal(rol);
  if (rolNormalizado === 'entrenador' && !id_categoria) {
    return res.status(400).json({
      message: 'El rol "entrenador" requiere seleccionar una categoría.'
    });
  }
  return null;
}

async function crear(req, res, next) {
  try {
    const { usuario, password, nombre, apellidos, rol, id_categoria } = req.body;
    const permisos = (await normalizePermisos(req.body)) || {};

    const faltan = [];
    if (!usuario) faltan.push('usuario');
    if (!password) faltan.push('contraseña');
    if (!nombre) faltan.push('nombre');
    if (!apellidos) faltan.push('apellidos');
    if (faltan.length) {
      return res.status(400).json({
        message: `Faltan los campos obligatorios: ${faltan.join(', ')}.`
      });
    }
    if (!isPasswordValid(password)) {
      return res.status(400).json({
        message: 'La contraseña debe tener mínimo 8 caracteres e incluir mayúsculas, minúsculas, números y caracteres especiales.'
      });
    }
    if (emailInvalido(req.body)) {
      return res.status(400).json({ message: 'El email no tiene un formato válido.' });
    }

    const rolNormalizado = rolFinal(rol);
    const errorCategoria = validaRolCategoria(res, rolNormalizado, id_categoria);
    if (errorCategoria) return errorCategoria;

    const hash = await hashPassword(password);
    const nuevo = await Usuario.create({
      usuario,
      password: hash,
      nombre,
      apellidos,
      rol: rolNormalizado,
      id_categoria: rolNormalizado === 'entrenador' ? id_categoria : null,
      ...camposEmailDesdeBody(req.body)
    });

    await guardarPermisosUsuario(nuevo.id, permisos);

    const completo = await Usuario.findByPk(nuevo.id, { include: includeUsuario });
    res.status(201).json(serializeUsuario(completo));
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const usuario = await Usuario.scope('withPassword').findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado.' });

    const { usuario: nuevoUsuario, nombre, apellidos, activo, password, rol, id_categoria } = req.body;
    const permisos = await normalizePermisos(req.body);

    if (emailInvalido(req.body)) {
      return res.status(400).json({ message: 'El email no tiene un formato válido.' });
    }

    if (password) {
      if (!isPasswordValid(password)) {
        return res.status(400).json({
          message: 'La contraseña debe tener mínimo 8 caracteres e incluir mayúsculas, minúsculas, números y caracteres especiales.'
        });
      }
      usuario.password = await hashPassword(password);
    }

    if (nuevoUsuario !== undefined) usuario.usuario = nuevoUsuario;
    if (nombre !== undefined) usuario.nombre = nombre;
    if (apellidos !== undefined) usuario.apellidos = apellidos;
    if (activo !== undefined) usuario.activo = activo;
    if (rol !== undefined) {
      const rolNormalizado = rolFinal(rol);
      const idCategoriaFinal = id_categoria !== undefined
        ? id_categoria
        : (rolNormalizado === 'entrenador' ? usuario.id_categoria : null);
      const errorCategoria = validaRolCategoria(res, rolNormalizado, idCategoriaFinal);
      if (errorCategoria) return errorCategoria;
      usuario.rol = rolNormalizado;
      usuario.id_categoria = rolNormalizado === 'entrenador' ? idCategoriaFinal : null;
    } else if (id_categoria !== undefined) {
      if (usuario.rol === 'entrenador') {
        const errorCategoria = validaRolCategoria(res, usuario.rol, id_categoria);
        if (errorCategoria) return errorCategoria;
        usuario.id_categoria = id_categoria;
      } else {
        usuario.id_categoria = null;
      }
    }

    // Configuración de correo: solo se tocan los campos que llegan.
    Object.assign(usuario, camposEmailDesdeBody(req.body));

    await usuario.save();

    if (permisos !== null && permisos !== undefined) {
      await guardarPermisosUsuario(usuario.id, permisos);
    }

    const completo = await Usuario.findByPk(usuario.id, { include: includeUsuario });
    res.json(serializeUsuario(completo));
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ message: 'No puedes eliminar tu propio usuario.' });
    }
    const eliminado = await Usuario.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Usuario no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

/**
 * Resetea el 2FA de un usuario (lo desactiva y borra sus códigos de
 * recuperación): el usuario tendrá que volver a configurarlo en el siguiente
 * acceso. Pensado para cuando alguien pierde el autenticador.
 */
async function resetear2fa(req, res, next) {
  try {
    const user = await Usuario.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
    await sequelize.transaction(async (t) => {
      await user.update({ totp_secret: null, totp_activado: false }, { transaction: t });
      await UsuarioCodigoRecuperacion.destroy({ where: { id_usuario: user.id }, transaction: t });
    });
    return res.json({ message: 'Segundo factor reseteado. El usuario deberá configurarlo de nuevo al iniciar sesión.' });
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar, resetear2fa };
