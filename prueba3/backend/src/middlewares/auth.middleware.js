const { verifyToken } = require('../utils/jwt.utils');

/**
 * Comprueba que la petición trae un JWT válido en la cabecera
 * Authorization: Bearer <token> y adjunta el usuario decodificado
 * a req.user para que las siguientes capas lo usen.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const parts = header.split(' ').filter(Boolean);

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ message: 'No autenticado. Falta el token de acceso.' });
  }

  const token = parts[1];

  try {
    req.user = verifyToken(token); // { id, usuario, secciones, roles }
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido o caducado.' });
  }
}

module.exports = authenticate;
