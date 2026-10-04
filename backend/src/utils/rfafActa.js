const path = require('path');
const { execFile } = require('child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'rfaf_acta.py');

/** Error de RFAF con el código HTTP que debe devolver la API. */
class ErrorActa extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/** Lee el acta de RFAF con el script de Python (una sola petición a rfaf.es
 * con la sesión de RFAF_COOKIE). Devuelve { local, visitante, resultado }. */
function leerActa(codigoPrimaria, codigoActa, { script = SCRIPT, args } = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      'python3',
      [script, ...(args || [String(codigoPrimaria), String(codigoActa)])],
      { timeout: 45000, env: { PATH: process.env.PATH, RFAF_COOKIE: process.env.RFAF_COOKIE || '' } },
      (err, stdout) => {
        let salida = null;
        try { salida = JSON.parse(stdout); } catch { /* sin JSON: fallo del propio script */ }
        if (salida && !salida.error && !err) return resolve(salida);
        if (err?.code === 2) return reject(new ErrorActa(salida?.error || 'La sesión de RFAF ha caducado.', 503));
        return reject(new ErrorActa(salida?.error || 'No se pudo leer el acta de RFAF.', 502));
      }
    );
  });
}

/** "PÉREZ GÓMEZ, JUAN" -> "PEREZ GOMEZ JUAN", para poder comparar nombres
 * de RFAF (con acentos/orden distinto) con los de nuestra base de datos. */
function normalizarNombre(texto) {
  return (texto || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { leerActa, normalizarNombre, ErrorActa, SCRIPT };
