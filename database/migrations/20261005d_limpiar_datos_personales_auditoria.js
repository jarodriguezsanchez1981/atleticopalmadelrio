// Quita del historial de cambios (tabla cambios) los datos personales que ya
// no se guardan (ver SENSITIVE_KEYS en backend/src/middlewares/audit.middleware.js):
// DNI, fecha de nacimiento, teléfono, email y foto, también dentro de objetos
// y listas anidados. Idempotente.

const CLAVES = ['dni', 'dni_encrypted', 'dni_hash', 'fecha_nacimiento', 'telefono', 'email', 'foto'];

function limpiar(valor) {
  if (Array.isArray(valor)) return valor.map(limpiar);
  if (!valor || typeof valor !== 'object') return valor;
  const limpio = {};
  for (const [clave, v] of Object.entries(valor)) {
    if (!CLAVES.includes(clave)) limpio[clave] = limpiar(v);
  }
  return limpio;
}

function parsear(json) {
  if (json === null || json === undefined) return null;
  return typeof json === 'string' ? JSON.parse(json) : json;
}

module.exports = async function limpiarAuditoria({ conn, logger }) {
  const [filas] = await conn.query('SELECT id, datos_previos, datos_nuevos FROM cambios');
  let limpiados = 0;
  for (const fila of filas) {
    const previos = parsear(fila.datos_previos);
    const nuevos = parsear(fila.datos_nuevos);
    const previosLimpios = limpiar(previos);
    const nuevosLimpios = limpiar(nuevos);
    if (JSON.stringify(previos) === JSON.stringify(previosLimpios)
      && JSON.stringify(nuevos) === JSON.stringify(nuevosLimpios)) continue;
    await conn.query('UPDATE cambios SET datos_previos = ?, datos_nuevos = ? WHERE id = ?', [
      previosLimpios === null ? null : JSON.stringify(previosLimpios),
      nuevosLimpios === null ? null : JSON.stringify(nuevosLimpios),
      fila.id
    ]);
    limpiados += 1;
  }
  logger(`    cambios: datos personales quitados de ${limpiados} de ${filas.length} registros.`);
};
