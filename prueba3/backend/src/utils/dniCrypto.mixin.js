/**
 * Mixin de Sequelize para cifrar/descifrar el DNI en reposo.
 *
 * El modelo debe tener:
 *  - campo real `dni_encrypted` (TEXT) donde se almacena el ciphertext.
 *  - campo real `dni_hash` (VARCHAR(64), UNIQUE) para búsquedas deterministas.
 *  - atributo virtual `dni` que se descifra automáticamente al leer.
 *
 * La búsqueda por DNI se debe hacer mediante `where: { dni_hash: hashForLookup(dni) }`.
 */
const { encrypt, decrypt, hashForLookup } = require('./aesCrypto');

function normalizeDni(value) {
  return String(value || '').toUpperCase().trim();
}

function applyDniEncryption(Model, encryptedField = 'dni_encrypted', hashField = 'dni_hash', virtualField = 'dni') {
  const attributes = Model.rawAttributes || {};
  if (!attributes[encryptedField]) {
    throw new Error(`El modelo ${Model.name} necesita el campo ${encryptedField}`);
  }
  if (!attributes[hashField]) {
    throw new Error(`El modelo ${Model.name} necesita el campo ${hashField}`);
  }

  Model.addHook('beforeValidate', (instance) => {
    const plain = instance.getDataValue(virtualField);
    if (plain !== undefined && plain !== null && plain !== '') {
      const normalized = normalizeDni(plain);
      instance.setDataValue(encryptedField, encrypt(normalized));
      instance.setDataValue(hashField, hashForLookup(normalized));
    }
  });

  Model.addHook('afterFind', (result) => {
    if (!result) return;
    const items = Array.isArray(result) ? result : [result];
    for (const item of items) {
      if (!item || typeof item.getDataValue !== 'function') continue;
      const encrypted = item.getDataValue(encryptedField);
      if (encrypted) {
        item.setDataValue(virtualField, decrypt(encrypted));
      }
    }
  });
}

module.exports = { applyDniEncryption, hashForLookup, normalizeDni };
