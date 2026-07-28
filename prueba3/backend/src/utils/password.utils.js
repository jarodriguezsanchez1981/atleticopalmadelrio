const bcrypt = require('bcrypt');
require('dotenv').config();

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

/**
 * Política de contraseñas exigida:
 *  - longitud mínima 8 caracteres
 *  - al menos 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial
 */
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[A-Za-z\d\S]{8,}$/;

function isPasswordValid(plainPassword) {
  return typeof plainPassword === 'string' && PASSWORD_REGEX.test(plainPassword);
}

async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

async function verifyPassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

module.exports = { isPasswordValid, hashPassword, verifyPassword, PASSWORD_REGEX };
