const path = require('path');
const { execFile } = require('child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'rfaf_acta.py');
const SCRIPT_CLASIFICACION = path.join(__dirname, '..', 'scripts', 'rfaf_clasificacion.py');
const SCRIPT_JORNADA = path.join(__dirname, '..', 'scripts', 'rfaf_jornada.py');

/** Error de RFAF con el código HTTP que debe devolver la API. */
class ErrorActa extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/** Sesión de RFAF: arranca con RFAF_COOKIE (la JSESSIONID de una sesión
 * abierta en un navegador, porque RFAF no crea sesiones útiles desde la IP del
 * servidor) y se reutiliza mientras siga viva (ver scripts/rfaf_acta.py). */
let sesionRfaf = process.env.RFAF_COOKIE || '';

/** Ejecuta un script de RFAF con la sesión compartida (el acta y la
 * clasificación usan la misma: si RFAF la rota, la nueva vale para las dos).
 * Devuelve su JSON sin la cookie. */
function ejecutarScript(script, args, error) {
  return new Promise((resolve, reject) => {
    execFile(
      'python3',
      [script, ...args],
      { timeout: 45000, env: { PATH: process.env.PATH, RFAF_COOKIE: sesionRfaf } },
      (err, stdout) => {
        let salida = null;
        try { salida = JSON.parse(stdout); } catch { /* sin JSON: fallo del propio script */ }
        if (!salida || salida.error || err) {
          return reject(new ErrorActa(salida?.error || error, 502));
        }
        const { cookie, ...datos } = salida;
        if (cookie) sesionRfaf = cookie;
        return resolve(datos);
      }
    );
  });
}

/** Lee el acta de RFAF con el script de Python. Devuelve { local, visitante,
 * resultado }. */
function leerActa(codigoPrimaria, codigoActa, { script = SCRIPT, args } = {}) {
  return ejecutarScript(script, args || [String(codigoPrimaria), String(codigoActa)], 'No se pudo leer el acta de RFAF.');
}

/** Lee la clasificación de una jornada de liga en RFAF. Devuelve { jornada,
 * fecha, equipos: [...] } (ver scripts/rfaf_clasificacion.py). */
function leerClasificacion({ codPrimaria, codGrupo, codCompeticion }, jornada, { script = SCRIPT_CLASIFICACION, args } = {}) {
  return ejecutarScript(script, args || [codPrimaria, codGrupo, codCompeticion, jornada].map(String),
    'No se pudo leer la clasificación de RFAF.');
}

/** Lee los partidos de una jornada de liga en RFAF (con el código de su acta).
 * Devuelve { jornada, partidos: [...] } (ver scripts/rfaf_jornada.py). */
function leerJornada({ codPrimaria, codGrupo, codCompeticion, codTemporada }, jornada, { script = SCRIPT_JORNADA, args } = {}) {
  return ejecutarScript(script, args || [codPrimaria, codGrupo, codCompeticion, codTemporada, jornada].map(String),
    'No se pudo leer la jornada de RFAF.');
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

module.exports = { leerActa, leerClasificacion, leerJornada, normalizarNombre, nombreDesdeActa, ErrorActa, SCRIPT, SCRIPT_CLASIFICACION, SCRIPT_JORNADA };
