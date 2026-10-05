// Cifra en reposo el DNI de jugadores, entrenadores y delegados (RGPD).
//
// Por tabla: añade dni_encrypted (AES-256-GCM, ver backend/src/utils/aesCrypto.js)
// y dni_hash (HMAC-SHA256, único, para buscar y evitar duplicados sin descifrar),
// cifra cada DNI, comprueba que todos se descifran igual que el original y solo
// entonces borra la columna dni en claro (con su índice único).
// Idempotente: si se corta a medias, al volver a ejecutarse rehace lo pendiente.
//
// OJO: sin AES_SECRET_KEY los DNI cifrados no se pueden recuperar.

const TABLAS = ['jugadores', 'entrenadores', 'delegados'];

function normalizar(dni) {
  return String(dni || '').toUpperCase().trim();
}

module.exports = async function cifrarDni({ conn, logger, aes }) {
  for (const tabla of TABLAS) {
    const [columnas] = await conn.query(`SHOW COLUMNS FROM \`${tabla}\``);
    const tiene = (c) => columnas.some((col) => col.Field === c);

    if (!tiene('dni_encrypted')) {
      await conn.query(`ALTER TABLE \`${tabla}\` ADD COLUMN \`dni_encrypted\` TEXT NULL AFTER \`apellidos\``);
    }
    if (!tiene('dni_hash')) {
      await conn.query(
        `ALTER TABLE \`${tabla}\` ADD COLUMN \`dni_hash\` CHAR(64) NULL AFTER \`dni_encrypted\`, ` +
        `ADD UNIQUE KEY \`uq_${tabla}_dni_hash\` (\`dni_hash\`)`
      );
    }
    if (!tiene('dni')) continue;

    const [filas] = await conn.query(`SELECT id, dni FROM \`${tabla}\` WHERE dni IS NOT NULL`);
    for (const fila of filas) {
      const dni = normalizar(fila.dni);
      await conn.query(
        `UPDATE \`${tabla}\` SET dni_encrypted = ?, dni_hash = ? WHERE id = ?`,
        dni ? [aes.encrypt(dni), aes.hashForLookup(dni), fila.id] : [null, null, fila.id]
      );
    }

    const [comprobar] = await conn.query(`SELECT id, dni, dni_encrypted FROM \`${tabla}\` WHERE dni IS NOT NULL`);
    for (const fila of comprobar) {
      const dni = normalizar(fila.dni);
      const descifrado = fila.dni_encrypted ? aes.decrypt(fila.dni_encrypted) : '';
      if (descifrado !== dni) {
        throw new Error(`${tabla} id ${fila.id}: el DNI cifrado no coincide con el original; no se borra la columna dni.`);
      }
    }

    await conn.query(`ALTER TABLE \`${tabla}\` DROP COLUMN \`dni\``);
    logger(`    ${tabla}: ${filas.length} DNI cifrados y columna dni en claro eliminada.`);
  }
};
