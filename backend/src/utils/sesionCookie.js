const jwt = require('jsonwebtoken');

/** Sesión en una cookie HttpOnly: el JavaScript de la página no puede leer el
 * token (un script inyectado no puede robar la sesión). SameSite=Strict y la
 * cabecera X-Requested-With en las peticiones que modifican datos (ver
 * auth.middleware) protegen contra CSRF. */
const COOKIE_SESION = 'apr_sesion';
const RUTA = '/api';

function opcionesCookie() {
  return {
    httpOnly: true,
    // En el EC2 (NODE_ENV=production) solo por HTTPS; en local se usa http.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: RUTA
  };
}

/** Guarda el token en la cookie, con la misma caducidad que el token. */
function ponerCookieSesion(res, token) {
  const exp = jwt.decode(token)?.exp;
  const maxAge = exp ? Math.max(0, exp * 1000 - Date.now()) : undefined;
  res.cookie(COOKIE_SESION, token, { ...opcionesCookie(), ...(maxAge ? { maxAge } : {}) });
}

function borrarCookieSesion(res) {
  res.clearCookie(COOKIE_SESION, opcionesCookie());
}

/** Valor de una cookie de la petición (sin cookie-parser). */
function leerCookie(req, nombre) {
  const cabecera = req.headers?.cookie || '';
  for (const parte of cabecera.split(';')) {
    const i = parte.indexOf('=');
    if (i < 0) continue;
    if (parte.slice(0, i).trim() === nombre) {
      try {
        return decodeURIComponent(parte.slice(i + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

module.exports = { COOKIE_SESION, ponerCookieSesion, borrarCookieSesion, leerCookie };
