const { Op } = require('sequelize');
const { desdeHoraEspana, partesEspana, diaEspana } = require('./horaEspana');

/**
 * Comprobación de la fecha y la hora de la próxima jornada de liga de cada
 * plantilla en RFAF, por si las cambian (aprobado por el usuario el
 * 06/11/2026): los martes, miércoles y jueves a las 13:00 (hora española) se
 * pide la página de la jornada (NFG_CmpJornada) de cada plantilla de la
 * temporada actual con códigos de RFAF, una petición por plantilla y un
 * minuto entre una y otra, sin reintentos. La URL lleva cod_primaria,
 * CodCompeticion y CodGrupo de la plantilla, CodJornada de su próxima jornada
 * (sección Jornadas: el próximo partido con número de jornada; la antigua
 * tabla jornadas ya no se usa) y CodTemporada=22. La fecha y la hora que valen
 * son las de RFAF: se ponen en el partido (y queda en Cambios). El lugar no se toca: el de los partidos en casa se pone a mano.
 * Si la sesión de RFAF ha caducado se para (fallaría en todas).
 * Solo en producción (EC2): en local no se pide nada a rfaf.es.
 */
const HORA_COMPROBACION = 13;
const DIAS_COMPROBACION = [2, 3, 4]; // martes, miércoles y jueves
const CODIGO_TEMPORADA_RFAF = '22';
const PAUSA_MS = 60 * 1000;
const MAX_ESPERA_MS = 6 * 60 * 60 * 1000; // setTimeout no admite esperas muy largas; se recalcula

const pausaPorDefecto = (ms) => new Promise((resolve) => { setTimeout(resolve, ms).unref?.(); });
const esDeSesion = (error) => /sesi[oó]n/i.test(String(error || ''));
const ORIGEN = 'RFAF (comprobación de horarios)';

/** "HH:MM" en hora española de `fecha`. */
function horaEspana(fecha) {
  const p = partesEspana(fecha);
  return `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`;
}

/** El partido del PALMA en los de la jornada de RFAF: por el código de equipo
 * de la plantilla o, si no lo trae, por el nombre (solo si hay uno). */
function partidoDelPalma(partidos, plantilla) {
  const { esPalma } = require('../controllers/clasificacion.controller');
  const codigo = plantilla.codigo_equipo ? String(plantilla.codigo_equipo) : null;
  if (codigo) {
    const p = partidos.find((x) => String(x.codigo_equipo_local) === codigo || String(x.codigo_equipo_visitante) === codigo);
    if (p) return p;
  }
  const delPalma = partidos.filter((x) => esPalma(x.equipo_local) || esPalma(x.equipo_visitante));
  return delPalma.length === 1 ? delPalma[0] : null;
}

/** Fecha nueva de un partido según RFAF, o null si no cambia (o RFAF no la da).
 * Sin hora en RFAF, se cambia solo el día y se deja la hora que tenía (o sin
 * hora: medianoche UTC exacta, ver controllers/jornada.controller.js). */
function fechaSegunRfaf(fechaActual, rfaf) {
  if (!rfaf?.fecha) return null;
  const [y, m, d] = rfaf.fecha.split('-').map(Number);
  const actual = new Date(fechaActual);
  const sinHora = actual.getUTCHours() === 0 && actual.getUTCMinutes() === 0 && actual.getUTCSeconds() === 0;
  let nueva;
  if (rfaf.hora) {
    const [h, mi] = rfaf.hora.split(':').map(Number);
    nueva = desdeHoraEspana(y, m, d, h, mi);
  } else if (sinHora) {
    nueva = new Date(Date.UTC(y, m - 1, d));
  } else {
    const [h, mi] = horaEspana(actual).split(':').map(Number);
    nueva = desdeHoraEspana(y, m, d, h, mi);
  }
  return nueva.getTime() === actual.getTime() ? null : nueva;
}

/**
 * Comprueba la próxima jornada de liga de cada plantilla. Devuelve
 * { comprobados, cambiados: [{ categoria, jornada, antes, despues }], errores }.
 */
async function comprobar({ log = console, pausa = pausaPorDefecto, pausaMs = PAUSA_MS, ahora = new Date() } = {}) {
  const { Partido, Cambio } = require('../models');
  const { plantillasLiga } = require('../controllers/liga.controller');
  const rfafActa = require('./rfafActa');
  const p = partesEspana(ahora);
  const inicioHoy = desdeHoraEspana(p.y, p.m, p.d, 0, 0);
  const hecho = { comprobados: 0, cambiados: [], errores: [] };
  let peticiones = 0;

  for (const plantilla of await plantillasLiga()) {
    const categoria = plantilla.categoria?.nombre || `plantilla ${plantilla.id}`;
    const partido = await Partido.findOne({
      where: { id_plantilla: plantilla.id, jornada: { [Op.ne]: null }, suspendido: false, fecha: { [Op.gte]: inicioHoy } },
      order: [['fecha', 'ASC']]
    });
    if (!partido) continue;
    if (peticiones++ > 0) await pausa(pausaMs);
    try {
      const datos = await rfafActa.leerJornada({
        codPrimaria: plantilla.codigo_primaria,
        codGrupo: plantilla.codigo_grupo,
        codCompeticion: plantilla.codigo_competicion,
        codTemporada: CODIGO_TEMPORADA_RFAF
      }, partido.jornada);
      if (datos.jornada != null && Number(datos.jornada) !== Number(partido.jornada)) {
        throw new Error(`RFAF ha devuelto la jornada ${datos.jornada} en lugar de la ${partido.jornada}.`);
      }
      const rfaf = partidoDelPalma(datos.partidos || [], plantilla);
      if (!rfaf) throw new Error(`no aparece el partido del PALMA en la jornada ${partido.jornada}.`);
      hecho.comprobados += 1;
      const nueva = fechaSegunRfaf(partido.fecha, rfaf);
      if (!nueva) continue;
      const antes = partido.fecha;
      await partido.update({ fecha: nueva });
      await Cambio.create({
        entidad: 'partidos', id_registro: partido.id, accion: 'editar',
        datos_previos: { fecha: antes }, datos_nuevos: { fecha: nueva, origen: ORIGEN }, id_usuario: null
      });
      const cambio = {
        categoria, jornada: partido.jornada,
        antes: `${diaEspana(antes)} ${horaEspana(antes)}`, despues: `${rfaf.fecha} ${rfaf.hora || ''}`.trim()
      };
      hecho.cambiados.push(cambio);
      log.log(`🕒 Horarios ${categoria}: jornada ${cambio.jornada} de ${cambio.antes} a ${cambio.despues} (RFAF).`);
    } catch (err) {
      hecho.errores.push({ categoria, error: err.message });
      log.warn(`⚠️  Horarios ${categoria}: ${err.message}`);
      if (esDeSesion(err.message)) break;
    }
  }
  log.log(`🕒 Horarios: ${hecho.comprobados} jornadas comprobadas, ${hecho.cambiados.length} cambiadas, ${hecho.errores.length} errores.`);
  return hecho;
}

let enCurso = null;
let temporizador = null;

/** Ejecuta una comprobación (nunca dos a la vez). */
function actualizar(opciones) {
  if (!enCurso) {
    enCurso = require('./tareasAutomaticas').ejecutar('horarios', (log) => comprobar({ ...opciones, log }))
      .catch((err) => console.warn('⚠️  Horarios:', err.message))
      .finally(() => { enCurso = null; });
  }
  return enCurso;
}

/** Instante de la próxima comprobación (martes, miércoles o jueves a las 13:00). */
function proximaEjecucion(ahora = new Date()) {
  const { proximaEjecucion: proximaHora } = require('./clasificacionAutomatica');
  return DIAS_COMPROBACION
    .map((dia) => proximaHora(HORA_COMPROBACION, ahora, dia))
    .reduce((a, b) => (a < b ? a : b));
}

function programar() {
  const espera = proximaEjecucion() - Date.now() + 1000; // un segundo de margen: ya es la hora
  temporizador = setTimeout(() => {
    if (espera <= MAX_ESPERA_MS) actualizar().finally(programar);
    else programar();
  }, Math.min(espera, MAX_ESPERA_MS));
  temporizador.unref?.();
}

/** Arranca la comprobación programada (server.js). */
function iniciar() {
  if (temporizador || process.env.NODE_ENV !== 'production') return;
  programar();
}

module.exports = {
  iniciar, actualizar, comprobar, proximaEjecucion, fechaSegunRfaf, partidoDelPalma,
  HORA_COMPROBACION, DIAS_COMPROBACION, CODIGO_TEMPORADA_RFAF
};
