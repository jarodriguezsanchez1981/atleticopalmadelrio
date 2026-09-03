const { Usuario, Seccion } = require('../models');
const { verifyPassword } = require('../utils/password.utils');
const { signToken } = require('../utils/jwt.utils');

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

async function login(req, res, next) {
  try {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
      return res.status(400).json({ message: 'Usuario y contraseña son obligatorios.' });
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
    const token = signToken({
      id: user.id,
      usuario: user.usuario,
      secciones: payload.secciones,
      permisos: payload.permisos,
      rol: payload.rol,
      id_categoria: payload.id_categoria
    });

    return res.json({
      token,
      user: payload
    });
  } catch (err) {
    return next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await Usuario.findByPk(req.user.id, { include: includeAuth });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
    return res.json(userPayload(user));
  } catch (err) {
    return next(err);
  }
}

module.exports = { login, me };
