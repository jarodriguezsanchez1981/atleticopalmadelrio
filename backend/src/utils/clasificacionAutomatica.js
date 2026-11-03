const { desdeHoraEspana, partesEspana } = require('./horaEspana');

/**
 * Copia automática de la clasificación de RFAF (Estadísticas → Clasificación):
 * los lunes a las 09:00 (hora española) se guardan las jornadas cuyo partido
 * fue el día anterior o antes, y al arrancar el backend se ponen al día las
 * que se hubieran quedado pendientes. A las 10:00 sale el informe semanal
 * (utils/informeSemanalAutomatico.js), ya con la clasificación copiada. Una petición a rfaf.es por
 * jornada; si falla, se vuelve a intentar en la siguiente actualización.
 * Después, las actas de la liga de Senior A (controllers/liga.controller.js).
 * Solo en producción (EC2): en local no se pide nada a rfaf.es.
 */
const MAX_ESPERA_MS = 6 * 60 * 60 * 1000; // setTimeout no admite esperas muy largas; se recalcula

let temporizador = null;
let enCurso = null;

/** Instante de las próximas HH:00 españolas (hoy si aún no han llegado). Con
 * `diaSemana` (0 = domingo, 1 = lunes…), las próximas HH:00 de ese día. */
function proximaEjecucion(hora, ahora = new Date(), diaSemana = null) {
  const p = partesEspana(ahora);
  for (let dias = 0; dias <= 7; dias++) {
    const candidata = desdeHoraEspana(p.y, p.m, p.d + dias, hora, 0);
    const dia = new Date(Date.UTC(p.y, p.m - 1, p.d + dias)).getUTCDay();
    if (candidata > ahora && (diaSemana == null || dia === diaSemana)) return candidata;
  }
  return desdeHoraEspana(p.y, p.m, p.d + 7, hora, 0);
}

/** Ejecuta una actualización (nunca dos a la vez). */
function actualizar() {
  if (!enCurso) {
    const { actualizarTodas } = require('../controllers/clasificacion.controller');
    enCurso = actualizarTodas()
      .catch((err) => console.warn('⚠️  Clasificación automática:', err.message))
      .then(() => require('../controllers/liga.controller').actualizar())
      // Si quedan jornadas o actas por copiar (o ha fallado), se sigue cada 10 minutos.
      .then((r) => require('./ligaRecuperacion').trasCopia(r))
      .catch((err) => console.warn('⚠️  Liga automática:', err.message))
      .finally(() => { enCurso = null; });
  }
  return enCurso;
}

function programar() {
  const { HORA_ACTUALIZACION, DIA_ACTUALIZACION } = require('../controllers/clasificacion.controller');
  const proxima = proximaEjecucion(HORA_ACTUALIZACION, new Date(), DIA_ACTUALIZACION);
  const espera = proxima - Date.now() + 1000; // un segundo de margen: ya es la hora
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
