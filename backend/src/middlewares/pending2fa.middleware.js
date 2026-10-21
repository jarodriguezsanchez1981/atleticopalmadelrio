const { verifyToken } = require('../utils/jwt.utils');
const { COOKIE_2FA, leerCookie } = require('../utils/sesionCookie');

/**
 * Valida el token temporal del 2FA (cookie `apr_2fa`), emitido tras acertar la
 * contraseña. NO es una sesión: solo permite completar el segundo factor.
 * `fase` esperada: 'verificar' (ya tiene 2FA) o 'configurar' (debe enrolarse).
 *
 * Como es una petición POST con cookie, exige X-Requested-With (CSRF), igual
 * que el resto de la API (ver auth.middleware).
 */
function requierePendiente2fa(fase) {
  return (req, res, next) => {
    if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
      return res.status(403).json({ message: 'Petición no permitida.' });
    }
    const token = leerCookie(req, COOKIE_2FA);
    if (!token) {
      return res.status(401).json({ message: 'La verificación ha caducado. Vuelve a iniciar sesión.' });
    }
    let datos;
    try {
      datos = verifyToken(token);
    } catch {
      return res.status(401).json({ message: 'La verificación ha caducado. Vuelve a iniciar sesión.' });
    }
    if (datos.tipo !== '2fa' || (fase && datos.fase !== fase)) {
      return res.status(401).json({ message: 'La verificación no es válida. Vuelve a iniciar sesión.' });
    }
    req.pendiente2fa = datos; // { tipo:'2fa', fase, id, usuario, secret? }
    return next();
  };
}

module.exports = requierePendiente2fa;
