const { Op } = require('sequelize');
const { LigaPartido, LigaJugador, LigaGol, LigaTarjeta, Clasificacion, Plantilla, Categoria, Temporada } = require('../models');
const rfafActa = require('../utils/rfafActa');
const { minutosJugados } = require('../utils/minutosActa');
const { esPalma } = require('./clasificacion.controller');

/**
 * Actas de todos los partidos de la liga de cada plantilla de la temporada
 * actual con sus códigos de RFAF (Estadísticas Rivales y Próximo Rival): goles,
 * minutos, jugadores y tarjetas de cada equipo, jornada a jornada. Todas las
 * categorías, también las de menores (aprobado por el usuario el 03/11/2026).
 *
 * Se copian solas de RFAF después de la clasificación de los lunes a las 09:00
 * (utils/clasificacionAutomatica.js), pidiendo a rfaf.es lo mínimo:
 * - una petición por jornada (NFG_CmpJornada) para saber sus partidos y el
 *   código del acta, una sola vez y solo de las jornadas cuya clasificación ya
 *   está guardada (es decir, ya jugadas);
 * - una petición por acta, una sola vez (lo guardado no se vuelve a pedir);
 * - el partido del PALMA no se pide: lo guarda "Finalizar Acta" con el acta
 *   que ya ha leído;
 * - una pausa entre peticiones y un máximo por ejecución entre todas las
 *   plantillas (Senior A primero, después por orden de categoría de mayor a
 *   menor); al primer error se
 *   para (se reintenta a los 30 minutos, salvo sesión caducada; ver
 *   utils/ligaRecuperacion.js).
 * Mientras queden jornadas o actas por copiar (p. ej. al empezar con la
 * temporada ya empezada) se repite cada 30 minutos hasta ponerse al día
 * (utils/ligaRecuperacion.js); después, solo la copia del lunes.
 */

// Límites de cada copia, entre todas las plantillas.
const MAX_JORNADAS_POR_DIA = 2;
const MAX_ACTAS_POR_DIA = 20;
// Días que se pide un acta que no trae jugadores (partido aplazado…) antes de dejarla.
const MAX_INTENTOS = 3;
const PAUSA_MS = 60 * 1000;
const MINUTOS_PARTIDO = 90;
const TIPO_FUTBOL_7 = 1;
// Duración del juego: 60 minutos en Fútbol 7, 90 en Fútbol 11.
const duracionPlantilla = (plantilla) => (Number(plantilla?.categoria?.id_tipofutbol) === TIPO_FUTBOL_7 ? 60 : MINUTOS_PARTIDO);
const LADOS = ['local', 'visitante'];

const pausaPorDefecto = (ms) => new Promise((resolve) => { setTimeout(resolve, ms).unref?.(); });

/** Goles "local-visitante" del resultado del acta; null si no es válido. */
function golesResultado(resultado) {
  const m = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(String(resultado || ''));
  return m ? { local: Number(m[1]), visitante: Number(m[2]) } : null;
}

/**
 * Guarda el acta (ya leída de RFAF) de un partido de la liga: sus jugadores con
 * minutos, goles y tarjetas de los dos equipos, sus goles con el minuto y sus
 * tarjetas con el marcador justo antes. Sustituye lo que hubiera. Sin fotos.
 * `duracion`: minutos del partido (60 en Fútbol 7).
 */
async function guardarActa(ligaPartido, acta, duracion = MINUTOS_PARTIDO) {
  const id = ligaPartido.id;
  const golesActa = Array.isArray(acta.goles) ? acta.goles : [];
  const clave = (nombre) => rfafActa.normalizarNombre(nombre);

  const jugadores = [];
  const titularDe = { local: new Map(), visitante: new Map() };
  for (const lado of LADOS) {
    for (const j of acta[lado]?.jugadores || []) {
      if (!j.nombre) continue;
      titularDe[lado].set(clave(j.nombre), !!j.titular);
      jugadores.push({
        id_liga_partido: id,
        lado,
        dorsal: j.dorsal ?? null,
        nombre: j.nombre,
        titular: !!j.titular,
        minuto_entrada: j.minuto_entrada ?? null,
        minuto_salida: j.minuto_salida ?? null,
        minutos: minutosJugados(j, duracion),
        goles: Number(j.goles) || 0,
        amarillas: Number(j.tarjeta_amarilla) || 0,
        rojas: Number(j.tarjeta_roja) || 0
      });
    }
  }

  const goles = golesActa
    .filter((g) => LADOS.includes(g.equipo))
    .map((g) => {
      const propia = g.tipo === 'propia';
      const titular = propia ? undefined : titularDe[g.equipo].get(clave(g.nombre));
      return {
        id_liga_partido: id,
        lado: g.equipo,
        nombre: g.nombre || null,
        minuto: g.minuto ?? null,
        tipo: propia ? 'propia' : g.tipo === 'penalti' ? 'penalti' : 'normal',
        titular: titular === undefined ? null : titular
      };
    });

  const tarjetas = [];
  for (const lado of LADOS) {
    for (const t of acta[lado]?.tarjetas || []) {
      const antes = t.minuto == null ? [] : golesActa.filter((g) => g.minuto != null && g.minuto < t.minuto);
      const titular = titularDe[lado].get(clave(t.nombre));
      tarjetas.push({
        id_liga_partido: id,
        lado,
        nombre: t.nombre,
        tipo: t.tipo === 'roja' ? 'roja' : 'amarilla',
        minuto: t.minuto ?? null,
        titular: titular === undefined ? null : titular,
        goles_favor: antes.filter((g) => g.equipo === lado).length,
        goles_contra: antes.filter((g) => g.equipo !== lado).length
      });
    }
  }

  await LigaJugador.destroy({ where: { id_liga_partido: id } });
  await LigaGol.destroy({ where: { id_liga_partido: id } });
  await LigaTarjeta.destroy({ where: { id_liga_partido: id } });
  if (jugadores.length) await LigaJugador.bulkCreate(jugadores);
  if (goles.length) await LigaGol.bulkCreate(goles);
  if (tarjetas.length) await LigaTarjeta.bulkCreate(tarjetas);

  const resultado = golesResultado(acta.resultado);
  await LigaPartido.update({
    goles_local: resultado?.local ?? null,
    goles_visitante: resultado?.visitante ?? null,
    acta_at: new Date()
  }, { where: { id } });
  return { jugadores: jugadores.length, goles: goles.length, tarjetas: tarjetas.length };
}

/**
 * Desde "Finalizar Acta": guarda también en la liga el partido del PALMA (con
 * el acta que ya se ha leído, sin pedir nada más a RFAF). Solo partidos de liga
 * (con jornada). Si la jornada aún no se había copiado de RFAF, se crea el
 * partido y la copia del lunes le pondrá después los códigos de equipo.
 */
async function guardarActaDelPalma({ partido, plantilla, codigoActa, acta }) {
  if (!(Number(partido.jornada) > 0) || !codigoActa) return null;
  const fecha = partido.fecha ? new Date(partido.fecha).toISOString().slice(0, 10) : null;
  const [ligaPartido] = await LigaPartido.findOrCreate({
    where: { id_plantilla: partido.id_plantilla, codigo_acta: String(codigoActa) },
    defaults: {
      id_plantilla: partido.id_plantilla,
      codigo_acta: String(codigoActa),
      jornada: Number(partido.jornada),
      fecha,
      equipo_local: acta.local?.nombre || '—',
      equipo_visitante: acta.visitante?.nombre || '—'
    }
  });
  return guardarActa(ligaPartido, acta, duracionPlantilla(plantilla));
}

/** Las plantillas de la temporada actual con sus códigos de RFAF (los cuatro
 * de la URL de la jornada), de la categoría mayor a la menor (Senior A primero). */
async function plantillasLiga() {
  const plantillas = await Plantilla.findAll({
    where: {
      codigo_primaria: { [Op.ne]: null },
      codigo_grupo: { [Op.ne]: null },
      codigo_competicion: { [Op.ne]: null },
      codigo_temporada: { [Op.ne]: null }
    },
    include: [
      { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'orden', 'id_tipofutbol'] },
      { model: Temporada, as: 'temporada', attributes: ['id', 'actual'], where: { actual: true } }
    ]
  }) || [];
  return [...plantillas].sort((a, b) => Number(b.categoria?.orden ?? 0) - Number(a.categoria?.orden ?? 0));
}

/** Jornadas jugadas (con la clasificación guardada) sin copiar todavía. */
async function jornadasPorCopiar(idPlantilla) {
  const jugadas = [...new Set((await Clasificacion.findAll({
    where: { id_plantilla: idPlantilla }, attributes: ['jornada'], raw: true
  }) || []).map((c) => Number(c.jornada)))].sort((a, b) => a - b);
  // Jornadas ya copiadas: algún partido con los códigos de equipo de RFAF
  // (el que crea "Finalizar Acta" no los lleva).
  const copiadas = new Set((await LigaPartido.findAll({
    where: { id_plantilla: idPlantilla, codigo_equipo_local: { [Op.ne]: null } }, attributes: ['jornada'], raw: true
  }) || []).map((p) => Number(p.jornada)));
  return jugadas.filter((j) => !copiadas.has(j));
}

/** Actas por descargar (sin la del PALMA). `soloNuevas`: solo las que aún no se
 * han pedido nunca (las de un partido aplazado se dejan para la copia del lunes). */
async function actasPorCopiar(idPlantilla, { soloNuevas = false } = {}) {
  return (await LigaPartido.findAll({
    where: { id_plantilla: idPlantilla, acta_at: null, intentos: soloNuevas ? 0 : { [Op.lt]: MAX_INTENTOS } },
    order: [['jornada', 'ASC'], ['id', 'ASC']]
  }) || []).filter((p) => !esPalma(p.equipo_local) && !esPalma(p.equipo_visitante));
}

/** true si quedan jornadas jugadas o actas nuevas por copiar (para la
 * recuperación cada 30 minutos). */
async function hayPendientes() {
  for (const plantilla of await plantillasLiga()) {
    if ((await jornadasPorCopiar(plantilla.id)).length > 0
      || (await actasPorCopiar(plantilla.id, { soloNuevas: true })).length > 0) return true;
  }
  return false;
}

let enCurso = null;

/**
 * Copia: primero los partidos de las jornadas ya jugadas que falten (como
 * mucho MAX_JORNADAS_POR_DIA entre todas las plantillas), después las actas
 * pendientes (como mucho MAX_ACTAS_POR_DIA, sin la del PALMA), con una pausa
 * entre peticiones. Al
 * primer error se para. Nunca dos a la vez (la del lunes y la recuperación).
 * Devuelve { jornadas, actas } guardadas y `error` si RFAF ha fallado.
 */
function actualizar(opciones = {}) {
  if (!enCurso) enCurso = copiar(opciones).finally(() => { enCurso = null; });
  return enCurso;
}

async function copiar({ log = console, pausa = pausaPorDefecto, pausaMs = PAUSA_MS, soloNuevas = false } = {}) {
  const hecho = { jornadas: [], actas: 0 };
  const plantillas = await plantillasLiga();
  if (!plantillas.length) return hecho;
  const competicionDe = (plantilla) => ({
    codPrimaria: plantilla.codigo_primaria,
    codGrupo: plantilla.codigo_grupo,
    codCompeticion: plantilla.codigo_competicion,
    codTemporada: plantilla.codigo_temporada
  });
  let peticiones = 0;
  const esperarTurno = async () => {
    if (peticiones++ > 0) await pausa(pausaMs + Math.floor(Math.random() * pausaMs / 2));
  };
  let categoria = '';

  try {
    let quedanJornadas = MAX_JORNADAS_POR_DIA;
    for (const plantilla of plantillas) {
      if (quedanJornadas <= 0) break;
      categoria = plantilla.categoria?.nombre || '';
      for (const jornada of (await jornadasPorCopiar(plantilla.id)).slice(0, quedanJornadas)) {
        quedanJornadas -= 1;
        await esperarTurno();
        const datos = await rfafActa.leerJornada(competicionDe(plantilla), jornada);
        if (datos.jornada != null && Number(datos.jornada) !== jornada) {
          throw new Error(`RFAF ha devuelto la jornada ${datos.jornada} en lugar de la ${jornada}.`);
        }
        const filas = (datos.partidos || []).map((p) => ({ ...p, id_plantilla: plantilla.id, jornada }));
        await LigaPartido.bulkCreate(filas, {
          updateOnDuplicate: ['jornada', 'fecha', 'hora', 'equipo_local', 'codigo_equipo_local', 'equipo_visitante', 'codigo_equipo_visitante']
        });
        hecho.jornadas.push(jornada);
        log.log(`⚽ Liga ${categoria}: jornada ${jornada} copiada (${filas.length} partidos).`);
      }
    }

    let quedanActas = MAX_ACTAS_POR_DIA;
    for (const plantilla of plantillas) {
      if (quedanActas <= 0) break;
      categoria = plantilla.categoria?.nombre || '';
      const codPrimaria = plantilla.codigo_primaria;
      let guardadas = 0;
      for (const p of (await actasPorCopiar(plantilla.id, { soloNuevas })).slice(0, quedanActas)) {
        quedanActas -= 1;
        await esperarTurno();
        let acta;
        try {
          acta = await rfafActa.leerActa(codPrimaria, p.codigo_acta);
        } catch (err) {
          // Acta sin los dos equipos (partido aún sin acta): otro día.
          if (/formato esperado/i.test(err.message)) {
            await LigaPartido.update({ intentos: (p.intentos || 0) + 1 }, { where: { id: p.id } });
            continue;
          }
          // Si la sesión ha caducado no es culpa del acta: no cuenta como intento.
          if (!/sesi[oó]n/i.test(err.message)) await LigaPartido.update({ intentos: (p.intentos || 0) + 1 }, { where: { id: p.id } });
          throw err;
        }
        const conJugadores = LADOS.some((l) => (acta[l]?.jugadores || []).length > 0);
        if (!conJugadores) {
          // Aún sin acta (partido aplazado o no jugado): se vuelve a mirar otro día.
          await LigaPartido.update({ intentos: (p.intentos || 0) + 1 }, { where: { id: p.id } });
          continue;
        }
        await guardarActa(p, acta, duracionPlantilla(plantilla));
        guardadas += 1;
        hecho.actas += 1;
      }
      if (guardadas) log.log(`⚽ Liga ${categoria}: ${guardadas} actas guardadas.`);
    }
  } catch (err) {
    log.warn(`⚠️  Liga ${categoria}: ${err.message} (se sigue en la siguiente copia).`);
    hecho.error = err.message;
  }
  return hecho;
}

module.exports = {
  guardarActa, guardarActaDelPalma, actualizar, hayPendientes, plantillasLiga,
  MAX_JORNADAS_POR_DIA, MAX_ACTAS_POR_DIA, MAX_INTENTOS
};
