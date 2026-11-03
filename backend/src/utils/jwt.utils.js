const jwt = require('jsonwebtoken');
require('../config/env');

/** Duración máxima de una sesión: 2 horas desde que se inició sesión (antes 1;
 * cambiado por el usuario el 03/11/2026). */
const DURACION_SESION_SEG = 2 * 60 * 60;

/** Algoritmo de firma fijo (HMAC-SHA256). Se declara de forma explícita tanto
 * al firmar como al verificar para no depender de los valores por defecto de la
 * librería: así el token solo se acepta si está firmado con HS256 (defensa en
 * profundidad frente a confusiones de algoritmo). */
const ALGORITMO = 'HS256';

/** Firma el token. Si el payload trae `exp` (renovación de una sesión ya
 * iniciada, ver auth.controller) se respeta; si no, caduca en 2 horas. */
function signToken(payload) {
  if (payload.exp) return jwt.sign(payload, process.env.JWT_SECRET, { algorithm: ALGORITMO });
  return jwt.sign(payload, process.env.JWT_SECRET, { algorithm: ALGORITMO, expiresIn: DURACION_SESION_SEG });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, { algorithms: [ALGORITMO] });
}

module.exports = { signToken, verifyToken, DURACION_SESION_SEG };
