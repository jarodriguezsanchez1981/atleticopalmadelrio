const jwt = require('jsonwebtoken');
require('../config/env');

/** Duración máxima de una sesión: 1 hora desde que se inició sesión. */
const DURACION_SESION_SEG = 60 * 60;

/** Firma el token. Si el payload trae `exp` (renovación de una sesión ya
 * iniciada, ver auth.controller) se respeta; si no, caduca en 1 hora. */
function signToken(payload) {
  if (payload.exp) return jwt.sign(payload, process.env.JWT_SECRET);
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: DURACION_SESION_SEG });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { signToken, verifyToken, DURACION_SESION_SEG };
