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

/** Sesión anónima de RFAF de la última lectura: reutilizarla permite pedir el
 * acta con una sola petición mientras siga viva (ver scripts/rfaf_acta.py). */
let sesionRfaf = '';

/** Lee el acta de RFAF con el script de Python. Devuelve { local, visitante,
 * resultado }. */
function leerActa(codigoPrimaria, codigoActa, { script = SCRIPT, args } = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      'python3',
      [script, ...(args || [String(codigoPrimaria), String(codigoActa)])],
      { timeout: 45000, env: { PATH: process.env.PATH, RFAF_COOKIE: sesionRfaf } },
      (err, stdout) => {
        let salida = null;
        try { salida = JSON.parse(stdout); } catch { /* sin JSON: fallo del propio script */ }
        if (!salida || salida.error || err) {
          return reject(new ErrorActa(salida?.error || 'No se pudo leer el acta de RFAF.', 502));
        }
        const { cookie, ...acta } = salida;
        if (cookie) sesionRfaf = cookie;
        return resolve(acta);
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

const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'da', 'do', 'dos', 'van', 'von']);

/** "GARCIA DE LA TORRE" -> "Garcia de la Torre" (los nombres de la base de
 * datos se guardan así, y RFAF los da en mayúsculas). */
function capitalizar(texto) {
  return (texto || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .split(' ')
    .map((p, i) => (i > 0 && PARTICULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ');
}

/** "PEREZ GOMEZ, JUAN" del acta -> { nombre: 'Juan', apellidos: 'Perez Gomez' }.
 * Sin coma, la última palabra se toma como nombre. */
function nombreDesdeActa(texto) {
  const limpio = (texto || '').replace(/\s+/g, ' ').trim();
  let [apellidos, nombre] = limpio.split(',').map((t) => t.trim());
  if (!nombre) {
    const partes = limpio.split(' ');
    nombre = partes.pop();
    apellidos = partes.join(' ');
  }
  return { nombre: capitalizar(nombre), apellidos: capitalizar(apellidos) || '-' };
}

module.exports = { leerActa, normalizarNombre, nombreDesdeActa, ErrorActa, SCRIPT };
