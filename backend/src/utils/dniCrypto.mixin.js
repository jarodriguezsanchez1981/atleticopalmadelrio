/**
 * DNI cifrado en reposo (RGPD) para los modelos de personas.
 *
 * En la base de datos el DNI se guarda en:
 *  - `dni_encrypted` (TEXT): AES-256-GCM, ver aesCrypto.js.
 *  - `dni_hash` (CHAR(64), único): HMAC-SHA256 del DNI normalizado, para buscar
 *    y detectar duplicados sin descifrar: `where: { dni_hash: hashForLookup(dni) }`.
 * El atributo `dni` es virtual: se descifra al leerlo y se cifra al asignarlo
 * (también en create/build), así que el resto del código y la API siguen
 * usando `dni` en claro. La migración 20261005c_cifrar_dni.js pasó los datos.
 */
const { DataTypes } = require('sequelize');
const { encrypt, decrypt, hashForLookup } = require('./aesCrypto');

function normalizeDni(value) {
  return String(value || '').toUpperCase().trim();
}

/** Atributos de Sequelize para el DNI cifrado (se mezclan en sequelize.define). */
function camposDniCifrado() {
  return {
    dni: {
      type: DataTypes.VIRTUAL,
      get() {
        const cifrado = this.getDataValue('dni_encrypted');
        return cifrado ? decrypt(cifrado) : null;
      },
      set(valor) {
        const dni = normalizeDni(valor);
        this.setDataValue('dni_encrypted', dni ? encrypt(dni) : null);
        this.setDataValue('dni_hash', dni ? hashForLookup(dni) : null);
      }
    },
    dni_encrypted: { type: DataTypes.TEXT, allowNull: true },
    dni_hash: { type: DataTypes.CHAR(64), allowNull: true, unique: true }
  };
}

/** Las columnas internas del cifrado no salen en el JSON (la API solo ve `dni`). */
function ocultarDniCifrado(Model) {
  const toJSONOriginal = Model.prototype.toJSON;
  Model.prototype.toJSON = function toJSON() {
    const json = toJSONOriginal.call(this);
    delete json.dni_encrypted;
    delete json.dni_hash;
    return json;
  };
}

/** Condición para buscar por DNI (en claro) sobre la columna hash. */
function whereDni(dni) {
  return { dni_hash: hashForLookup(normalizeDni(dni)) };
}

module.exports = { camposDniCifrado, ocultarDniCifrado, whereDni, normalizeDni };
