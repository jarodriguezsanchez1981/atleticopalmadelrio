const { Op } = require('sequelize');

/**
 * Finalizar Acta automático (pedido por el usuario el 07/11/2026): una hora
 * después de terminar cada partido de liga del PALMA (su fecha más el
 * tiempopartido de la categoría) se lee su acta de RFAF y se guarda lo mismo
 * que con el botón «Finalizar Acta» (partido.controller.finalizarPartido).
 * Si el partido no tiene código de acta, se saca de la página de su jornada
 * (NFG_CmpJornada, con los códigos de la plantilla y CodTemporada=22): una
 * petición; y otra para el acta. Cada partido se intenta una sola vez
 * (partidos.acta_auto_at), sin reintentos: si el acta aún no está publicada,
 * queda para el botón. Con varios partidos a la vez, un minuto entre uno y
 * otro. Si la sesión de RFAF ha caducado se para hasta que se ponga otra
 * (al cambiar RFAF_COOKIE se recrea el backend y se vuelve a intentar).
 * Solo en producción (EC2): en local no se pide nada a rfaf.es.
 */
const MARGEN_MIN = 60; // una hora después de terminar
const DURACION_DEFECTO_MIN = 90; // categorías sin tiempopartido
const VENTANA_MS = 3 * 24 * 60 * 60 * 1000; // no se buscan partidos más antiguos
const COMPROBACION_MS = 5 * 60 * 1000;
const PAUSA_MS = 60 * 1000; // entre partidos
const PAUSA_ACTA_MS = 10 * 1000; // entre la jornada y el acta de un partido
const ORIGEN = 'RFAF (Finalizar Acta automático)';

const pausaPorDefecto = (ms) => new Promise((resolve) => { setTimeout(resolve, ms).unref?.(); });
const esDeSesion = (error) => /sesi[oó]n/i.test(String(error || ''));

/** "Sin hora": medianoche UTC exacta (ver controllers/jornada.controller.js). */
function sinHora(fecha) {
  const f = new Date(fecha);
  return f.getUTCHours() === 0 && f.getUTCMinutes() === 0 && f.getUTCSeconds() === 0;
}

/** Instante a partir del cual se lee el acta del partido (o null si no tiene hora). */
function momentoActa(partido) {
  if (!partido.fecha || sinHora(partido.fecha)) return null;
  const duracion = Number(partido.plantilla?.categoria?.tiempopartido) || DURACION_DEFECTO_MIN;
  return new Date(new Date(partido.fecha).getTime() + (duracion + MARGEN_MIN) * 60 * 1000);
}

/** Partidos de liga sin finalizar cuya acta ya toca leer, del más antiguo al más reciente. */
async function pendientes(ahora) {
  const { Partido, Plantilla, Categoria } = require('../models');
  const partidos = await Partido.findAll({
    where: {
      jornada: { [Op.ne]: null },
      suspendido: false,
      acta_finalizada_at: null,
      acta_auto_at: null,
      fecha: { [Op.gte]: new Date(ahora.getTime() - VENTANA_MS), [Op.lte]: ahora }
    },
    include: [{
      model: Plantilla,
      as: 'plantilla',
      attributes: ['id', 'codigo_primaria', 'codigo_grupo', 'codigo_competicion', 'codigo_equipo'],
      include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'tiempopartido'] }]
    }],
    order: [['fecha', 'ASC']]
  }) || [];
  return partidos.filter((p) => {
    const momento = momentoActa(p);
    return momento && momento <= ahora;
  });
}

let sesionCaducada = false;

/**
 * Finaliza las actas que tocan. Devuelve
 * { finalizados: [{ categoria, jornada, resultado }], sinActa: [...], errores: [...] }.
 */
async function comprobar({ log = console, pausa = pausaPorDefecto, ahora = new Date() } = {}) {
  const hecho = { finalizados: [], sinActa: [], errores: [] };
  if (sesionCaducada) return hecho;
  const { Cambio } = require('../models');
  const { finalizarPartido } = require('../controllers/partido.controller');
  const { partidoDelPalma, CODIGO_TEMPORADA_RFAF } = require('./horariosPartidos');
  const rfafActa = require('./rfafActa');
  let peticiones = 0;

  for (const partido of await pendientes(ahora)) {
    const plantilla = partido.plantilla || {};
    const categoria = plantilla.categoria?.nombre || `plantilla ${partido.id_plantilla}`;
    const codigoPrimaria = partido.codigo_primaria || plantilla.codigo_primaria;
    let codigoActa = partido.codigo_acta;
    const conJornada = plantilla.codigo_grupo && plantilla.codigo_competicion;
    if (!codigoPrimaria || (!codigoActa && !conJornada)) continue; // sin códigos de RFAF: nada que pedir

    if (peticiones++ > 0) await pausa(PAUSA_MS);
    // Se marca antes de pedir nada: un solo intento aunque falle o se reinicie.
    await partido.update({ acta_auto_at: new Date() });
    try {
      if (!codigoActa) {
        const datos = await rfafActa.leerJornada({
          codPrimaria: codigoPrimaria,
          codGrupo: plantilla.codigo_grupo,
          codCompeticion: plantilla.codigo_competicion,
          codTemporada: CODIGO_TEMPORADA_RFAF
        }, partido.jornada);
        codigoActa = partidoDelPalma(datos.partidos || [], plantilla)?.codigo_acta || null;
        if (!codigoActa) {
          hecho.sinActa.push({ categoria, jornada: partido.jornada });
          log.warn(`⚠️  Acta automática ${categoria}: el acta de la jornada ${partido.jornada} aún no está en RFAF (queda para «Finalizar Acta»).`);
          continue;
        }
        await pausa(PAUSA_ACTA_MS);
      }
      const { resultado } = await finalizarPartido(partido, { codigo_acta: codigoActa, codigo_primaria: codigoPrimaria });
      await Cambio.create({
        entidad: 'partidos', id_registro: partido.id, accion: 'editar',
        datos_previos: null, datos_nuevos: { resultado, codigo_acta: codigoActa, origen: ORIGEN }, id_usuario: null
      });
      hecho.finalizados.push({ categoria, jornada: partido.jornada, resultado });
      log.log(`📋 Acta automática ${categoria}: jornada ${partido.jornada} finalizada (${resultado}).`);
    } catch (err) {
      hecho.errores.push({ categoria, error: err.message });
      log.warn(`⚠️  Acta automática ${categoria}: ${err.message}`);
      if (esDeSesion(err.message)) {
        // No ha sido un intento de verdad: se repite con la próxima sesión.
        await partido.update({ acta_auto_at: null });
        sesionCaducada = true;
        break;
      }
    }
  }
  if (hecho.finalizados.length || hecho.sinActa.length || hecho.errores.length) {
    log.log(`📋 Actas automáticas: ${hecho.finalizados.length} finalizadas, ${hecho.sinActa.length} sin publicar, ${hecho.errores.length} errores.`);
  }
  return hecho;
}

let enCurso = null;
let temporizador = null;

/** Ejecuta una comprobación (nunca dos a la vez). */
function actualizar(opciones) {
  if (!enCurso) {
    enCurso = comprobar(opciones)
      .catch((err) => console.warn('⚠️  Actas automáticas:', err.message))
      .finally(() => { enCurso = null; });
  }
  return enCurso;
}

/** Arranca la comprobación cada 5 minutos (server.js). */
function iniciar() {
  if (temporizador || process.env.NODE_ENV !== 'production') return;
  temporizador = setInterval(() => actualizar(), COMPROBACION_MS);
  temporizador.unref?.();
  actualizar();
}

/** Solo para los tests. */
function reiniciarSesion() { sesionCaducada = false; }

module.exports = { iniciar, actualizar, comprobar, momentoActa, reiniciarSesion, MARGEN_MIN };
