const { Usuario, Rol } = require('../models');
const { verifyPassword } = require('../utils/password.utils');
const { signToken } = require('../utils/jwt.utils');

async function login(req, res, next) {
  try {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
      return res.status(400).json({ message: 'Usuario y contraseña son obligatorios.' });
    }

    // Necesitamos el hash, así que usamos el scope que no lo excluye
    const user = await Usuario.scope('withPassword').findOne({
      where: { usuario },
      include: [{ model: Rol, as: 'rol' }]
    });

    // Respuesta genérica para no revelar si el usuario existe o no
    const credencialesInvalidas = () =>
      res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });

    if (!user || !user.activo) return credencialesInvalidas();

    const passwordOk = await verifyPassword(password, user.password);
    if (!passwordOk) return credencialesInvalidas();

    const token = signToken({
      id: user.id,
      usuario: user.usuario,
      rol: user.rol.nombre
    });

    return res.json({
      token,
      user: {
        id: user.id,
        usuario: user.usuario,
        nombre: user.nombre,
        apellidos: user.apellidos,
        rol: user.rol.nombre
      }
    });
  } catch (err) {
    return next(err);
  }
}

// Devuelve los datos del usuario autenticado a partir del token (para refrescar el store de Pinia)
async function me(req, res, next) {
  try {
    const user = await Usuario.findByPk(req.user.id, {
      include: [{ model: Rol, as: 'rol' }]
    });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

    return res.json({
      id: user.id,
      usuario: user.usuario,
      nombre: user.nombre,
      apellidos: user.apellidos,
      rol: user.rol.nombre
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { login, me };
