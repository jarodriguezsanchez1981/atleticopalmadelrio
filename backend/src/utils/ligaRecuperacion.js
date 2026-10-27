/**
 * Recuperación de las actas de la liga (Estadísticas Rivales): mientras queden
 * jornadas jugadas o actas nuevas por copiar, la copia de
 * controllers/liga.controller.js se repite cada 30 minutos (cada vez con sus
 * límites y pausas) en vez de esperar al día siguiente. Al ponerse al día, o
 * al primer error de RFAF (p. ej. sesión caducada), se para: lo retoma la
 * copia diaria de las 10:00 (utils/clasificacionAutomatica.js). Solo en
 * producción.
 */
const INTERVALO_MS = 30 * 60 * 1000;

let temporizador = null;

async function siguiente(log = console) {
  temporizador = null;
  const liga = require('../controllers/liga.controller');
  try {
    if (!(await liga.hayPendientes())) {
      log.log('⚽ Liga: al día; a partir de ahora, solo la copia diaria.');
      return;
    }
    const r = await liga.actualizar({ log, soloNuevas: true });
    if (r.error) return; // se retoma en la copia diaria
    programar(log);
  } catch (err) {
    log.warn('⚠️  Liga (recuperación):', err.message);
  }
}

/** Programa la siguiente copia dentro de 30 minutos (si no hay ya una). */
function programar(log = console) {
  if (temporizador || process.env.NODE_ENV !== 'production') return;
  temporizador = setTimeout(() => siguiente(log), INTERVALO_MS);
  temporizador.unref?.();
}

module.exports = { programar, siguiente, INTERVALO_MS };
