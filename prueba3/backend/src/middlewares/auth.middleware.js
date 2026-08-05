const { verifyToken } = require('../utils/jwt.utils');

/**
 * Comprueba que la petición trae un JWT válido en la cabecera
 * Authorization: Bearer <token> y adjunta el usuario decodificado
 * a req.user para que las siguientes capas lo usen.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'No autenticado. Falta el token de acceso.' });
  }

  try {
    req.user = verifyToken(token); // { id, usuario, secciones }
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido o caducado.' });
  }
}

module.exports = authenticate;
