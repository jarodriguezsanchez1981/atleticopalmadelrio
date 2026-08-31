/**
 * Cifrado simétrico AES-256-GCM para datos sensibles en reposo.
 *
 * IMPORTANTE sobre las contraseñas de usuario:
 * Las contraseñas de acceso a la intranet NO se cifran con AES (el cifrado
 * simétrico es reversible: quien tenga la clave puede recuperar el texto
 * plano). Las contraseñas se procesan con bcrypt (hash de un solo sentido,
 * con salt aleatorio incorporado), que es el estándar de la industria para
 * credenciales. Ver password.utils.js.
 *
 * La utilidad `encrypt`/`decrypt` y `hashForLookup` están listas para
 * proteger PII como el DNI de jugadores, entrenadores y delegados. Su
 * aplicación en los modelos requiere una migración de esquema
 * (ver dniCrypto.mixin.js) y por tanto se deja documentada para una
 * siguiente fase de hardening; el resto de vulnerabilidades conocidas
 * (dependencias, control de acceso, validaciones) se han corregido aquí.
 */
const crypto = require('crypto');
require('../config/env');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // recomendado para GCM

const HEX64_RE = /^[0-9a-fA-F]{64}$/;

function getKey() {
  const key = process.env.AES_SECRET_KEY;
  if (!key || !HEX64_RE.test(key)) {
    throw new Error(
      'AES_SECRET_KEY debe ser una cadena hexadecimal de 64 caracteres (32 bytes / AES-256).'
    );
  }
  return Buffer.from(key, 'hex');
}

/**
 * Cifra un texto plano y devuelve "iv:authTag:cipherText" en base64.
 */
function encrypt(plainText) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':');
}

/**
 * Descifra un valor generado por encrypt().
 */
function decrypt(payload) {
  const [ivB64, authTagB64, dataB64] = payload.split(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final()
  ]);
  return decrypted.toString('utf8');
}

/**
 * Hash determinista (HMAC-SHA256) para poder buscar un DNI cifrado
 * sin revelar su valor real. Usa AES_SECRET_KEY como clave HMAC.
 */
function hashForLookup(plainText) {
  return crypto.createHmac('sha256', getKey()).update(String(plainText).toUpperCase().trim()).digest('hex');
}

module.exports = { encrypt, decrypt, hashForLookup };
