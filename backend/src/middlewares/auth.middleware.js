const { verifyToken } = require('../utils/jwt.utils');
const { COOKIE_SESION, leerCookie } = require('../utils/sesionCookie');

const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Comprueba que la petición trae un JWT válido y adjunta el usuario
 * decodificado a req.user para que las siguientes capas lo usen.
 *
 * El token llega en la cookie HttpOnly de sesión (navegador, ver
 * sesionCookie.js) o en la cabecera Authorization: Bearer <token> (scripts).
 * Con la cookie, las peticiones que modifican datos deben llevar
 * X-Requested-With: XMLHttpRequest (protección CSRF: un formulario de otra
 * web no puede añadir cabeceras).
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  let token = null;
  if (header) {
    const parts = header.split(' ').filter(Boolean);
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ message: 'No autenticado. Falta el token de acceso.' });
    }
    token = parts[1];
  } else {
    token = leerCookie(req, COOKIE_SESION);
    if (token && !METODOS_SEGUROS.has(req.method) && req.headers['x-requested-with'] !== 'XMLHttpRequest') {
      return res.status(403).json({ message: 'Petición no permitida.' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'No autenticado. Falta el token de acceso.' });
  }

  try {
    req.user = verifyToken(token); // { id, usuario, secciones, rol }
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido o caducado.' });
  }
}

module.exports = authenticate;
