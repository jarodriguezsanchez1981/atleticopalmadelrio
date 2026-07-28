const { verifyToken } = require('../utils/jwt');

/**
 * Comprueba que la peticion trae un Bearer token valido y adjunta
 * el usuario decodificado en req.user para el resto de middlewares/controladores.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'No autenticado. Falta el token.' });
  }

  try {
    req.user = verifyToken(token); // { id, role, name, categoryIds }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalido o caducado.' });
  }
}

module.exports = { authenticate };
