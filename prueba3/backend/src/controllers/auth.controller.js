const { Usuario, Seccion, Rol } = require('../models');
const { verifyPassword } = require('../utils/password.utils');
const { signToken } = require('../utils/jwt.utils');

const includeAuth = [
  { model: Seccion, as: 'secciones', attributes: ['id', 'clave', 'nombre'], through: { attributes: [] } },
  { model: Rol, as: 'roles', attributes: ['id', 'nombre'] }
];

function userPayload(user) {
  const secciones = Array.from(new Set((user.secciones || []).map((s) => s.clave)));
  const roles = Array.from(new Set((user.roles || []).map((r) => r.nombre)));
  return {
    id: user.id,
    usuario: user.usuario,
    nombre: user.nombre,
    apellidos: user.apellidos,
    secciones,
    roles
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
      roles: payload.roles
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
