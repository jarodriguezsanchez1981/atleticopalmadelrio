/**
 * Cifrado simétrico AES-256-GCM para datos sensibles en reposo
 * (por ejemplo, el DNI de los jugadores).
 *
 * IMPORTANTE sobre las contraseñas de usuario:
 * Las contraseñas de acceso a la intranet NO se cifran con AES (el cifrado
 * simétrico es reversible: quien tenga la clave puede recuperar el texto
 * plano). Las contraseñas se procesan con bcrypt (hash de un solo sentido,
 * con salt aleatorio incorporado), que es el estándar de la industria para
 * credenciales. Ver password.utils.js.
 *
 * AES-256 sí se usa aquí, según lo solicitado, para cifrar en reposo otros
 * datos sensibles del club (ej. DNI de jugadores) que en algún momento
 * deban poder descifrarse para mostrarse a un usuario autorizado.
 */
const crypto = require('crypto');
require('dotenv').config();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // recomendado para GCM

function getKey() {
  const key = process.env.AES_SECRET_KEY;
  if (!key || key.length !== 64) {
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

module.exports = { encrypt, decrypt };
