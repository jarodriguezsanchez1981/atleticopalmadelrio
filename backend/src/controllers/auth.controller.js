const { Usuario, Seccion } = require('../models');
const { verifyPassword } = require('../utils/password.utils');
const { signToken } = require('../utils/jwt.utils');
const { ponerCookieSesion, borrarCookieSesion } = require('../utils/sesionCookie');

const includeAuth = [
  { model: Seccion, as: 'secciones', attributes: ['id', 'clave', 'nombre'], through: { attributes: ['puede_ver', 'puede_editar'] } }
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
    id_categoria: user.id_categoria || null
  };
}

/** Token de sesión con los permisos del usuario en este momento. */
function tokenPara(user, payload) {
  return signToken({
    id: user.id,
    usuario: user.usuario,
    secciones: payload.secciones,
    permisos: payload.permisos,
    rol: payload.rol,
    id_categoria: payload.id_categoria
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
    ponerCookieSesion(res, tokenPara(user, payload));
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

module.exports = { login, me, logout };
