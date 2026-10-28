/**
 * Recuperación de las actas de la liga (Estadísticas Rivales): mientras queden
 * jornadas jugadas o actas nuevas por copiar, la copia de
 * controllers/liga.controller.js se repite cada 30 minutos (cada vez con sus
 * límites y pausas) en vez de esperar al día siguiente. Al ponerse al día se
 * para; lo retoma la copia diaria de las 10:00 (utils/clasificacionAutomatica.js).
 * Si una copia falla, se reintenta en la siguiente vuelta (a los 30 minutos),
 * como mucho MAX_FALLOS seguidos; si es por la sesión de RFAF caducada no se
 * reintenta (fallaría siempre): hay que poner una JSESSIONID nueva en
 * RFAF_COOKIE, y al reiniciar el backend sigue sola. Solo en producción.
 */
const INTERVALO_MS = 30 * 60 * 1000;
const MAX_FALLOS = 3;

let temporizador = null;
let fallosSeguidos = 0;

const esDeSesion = (error) => /sesi[oó]n/i.test(String(error || ''));

/** Tras una copia: decide si seguir dentro de 30 minutos. */
function trasCopia(r, log = console) {
  if (!r?.error) {
    fallosSeguidos = 0;
    return programar(log);
  }
  if (esDeSesion(r.error)) {
    log.warn('⚠️  Liga: la sesión de RFAF ha caducado; se sigue al poner una JSESSIONID nueva.');
    return false;
  }
  fallosSeguidos += 1;
  if (fallosSeguidos >= MAX_FALLOS) {
    log.warn(`⚠️  Liga: ${MAX_FALLOS} fallos seguidos; se reintenta en la copia diaria.`);
    fallosSeguidos = 0;
    return false;
  }
  log.log(`⚽ Liga: se reintenta en 30 minutos (fallo ${fallosSeguidos} de ${MAX_FALLOS}).`);
  return programar(log);
}

async function siguiente(log = console) {
  temporizador = null;
  const liga = require('../controllers/liga.controller');
  try {
    if (!(await liga.hayPendientes())) {
      fallosSeguidos = 0;
      log.log('⚽ Liga: al día; a partir de ahora, solo la copia diaria.');
      return;
    }
    trasCopia(await liga.actualizar({ log, soloNuevas: true }), log);
  } catch (err) {
    log.warn('⚠️  Liga (recuperación):', err.message);
  }
}

/** Programa la siguiente copia dentro de 30 minutos (si no hay ya una). */
function programar(log = console) {
  if (temporizador || process.env.NODE_ENV !== 'production') return false;
  temporizador = setTimeout(() => siguiente(log), INTERVALO_MS);
  temporizador.unref?.();
  return true;
}

module.exports = { programar, siguiente, trasCopia, INTERVALO_MS, MAX_FALLOS };
