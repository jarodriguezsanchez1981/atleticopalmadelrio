const { desdeHoraEspana, partesEspana } = require('./horaEspana');

/**
 * Copia automática de la clasificación de RFAF (Estadísticas → Clasificación):
 * todos los días a las 12:00 (hora española) se guardan las jornadas cuyo
 * partido fue el día anterior o antes, y al arrancar el backend se ponen al
 * día las que se hubieran quedado pendientes. Una petición a rfaf.es por
 * jornada; si falla, se vuelve a intentar en la siguiente actualización.
 * Solo en producción (EC2): en local no se pide nada a rfaf.es.
 */
const MAX_ESPERA_MS = 6 * 60 * 60 * 1000; // setTimeout no admite esperas muy largas; se recalcula

let temporizador = null;
let enCurso = null;

/** Instante de las próximas HH:00 españolas (hoy si aún no han llegado). */
function proximaEjecucion(hora, ahora = new Date()) {
  const p = partesEspana(ahora);
  const hoy = desdeHoraEspana(p.y, p.m, p.d, hora, 0);
  return hoy > ahora ? hoy : desdeHoraEspana(p.y, p.m, p.d + 1, hora, 0);
}

/** Ejecuta una actualización (nunca dos a la vez). */
function actualizar() {
  if (!enCurso) {
    const { actualizarTodas } = require('../controllers/clasificacion.controller');
    enCurso = actualizarTodas()
      .catch((err) => console.warn('⚠️  Clasificación automática:', err.message))
      .finally(() => { enCurso = null; });
  }
  return enCurso;
}

function programar() {
  const { HORA_ACTUALIZACION } = require('../controllers/clasificacion.controller');
  const proxima = proximaEjecucion(HORA_ACTUALIZACION);
  const espera = proxima - Date.now() + 1000; // un segundo de margen: ya son las 12:00
  temporizador = setTimeout(() => {
    if (espera <= MAX_ESPERA_MS) actualizar().finally(programar);
    else programar();
  }, Math.min(espera, MAX_ESPERA_MS));
  temporizador.unref?.();
}

/** Arranca la copia automática (server.js). */
function iniciar() {
  if (temporizador || process.env.NODE_ENV !== 'production') return;
  actualizar();
  programar();
}

module.exports = { iniciar, actualizar, proximaEjecucion };
