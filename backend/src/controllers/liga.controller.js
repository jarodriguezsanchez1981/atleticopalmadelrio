const { Op } = require('sequelize');
const { LigaPartido, LigaJugador, LigaGol, LigaTarjeta, Clasificacion, Plantilla, Categoria, Temporada } = require('../models');
const rfafActa = require('../utils/rfafActa');
const { minutosJugados } = require('../utils/minutosActa');
const { esPalma } = require('./clasificacion.controller');

/**
 * Actas de todos los partidos de la liga de Senior A (Estadísticas Rivales):
 * goles, minutos, jugadores y tarjetas de cada equipo, jornada a jornada.
 *
 * Se copian solas de RFAF después de la clasificación diaria de las 10:00
 * (utils/clasificacionAutomatica.js), pidiendo a rfaf.es lo mínimo:
 * - una petición por jornada (NFG_CmpJornada) para saber sus partidos y el
 *   código del acta, una sola vez y solo de las jornadas cuya clasificación ya
 *   está guardada (es decir, ya jugadas);
 * - una petición por acta, una sola vez (lo guardado no se vuelve a pedir);
 * - el partido del PALMA no se pide: lo guarda "Finalizar Acta" con el acta
 *   que ya ha leído;
 * - una pausa entre peticiones y un máximo por día; al primer error se para
 *   hasta el día siguiente (sin reintentos).
 */

// Solo la liga de Senior A: el resto de categorías son de menores y no se
// guardan datos de sus rivales.
const CATEGORIA_LIGA = 'Senior A';
const MAX_JORNADAS_POR_DIA = 2;
const MAX_ACTAS_POR_DIA = 20;
// Días que se pide un acta que no trae jugadores (partido aplazado…) antes de dejarla.
const MAX_INTENTOS = 3;
const PAUSA_MS = 60 * 1000;
const MINUTOS_PARTIDO = 90;
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
 */
async function guardarActa(ligaPartido, acta) {
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
        minutos: minutosJugados(j, MINUTOS_PARTIDO),
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
 * (con jornada) de Senior A. Si la jornada aún no se había copiado de RFAF, se
 * crea el partido y la copia diaria le pondrá después los códigos de equipo.
 */
async function guardarActaDelPalma({ partido, plantilla, codigoActa, acta }) {
  if (plantilla?.categoria?.nombre !== CATEGORIA_LIGA || !(Number(partido.jornada) > 0) || !codigoActa) return null;
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
  return guardarActa(ligaPartido, acta);
}

/** La plantilla de Senior A de la temporada actual con sus códigos de RFAF
 * (los cuatro de la URL de la jornada). null si no hay o le falta alguno. */
async function plantillaLiga() {
  const plantilla = await Plantilla.findOne({
    where: {
      codigo_primaria: { [Op.ne]: null },
      codigo_grupo: { [Op.ne]: null },
      codigo_competicion: { [Op.ne]: null },
      codigo_temporada: { [Op.ne]: null }
    },
    include: [
      { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'], where: { nombre: CATEGORIA_LIGA } },
      { model: Temporada, as: 'temporada', attributes: ['id', 'actual'], where: { actual: true } }
    ]
  });
  return plantilla || null;
}

/**
 * Copia diaria: primero los partidos de las jornadas ya jugadas que falten
 * (como mucho MAX_JORNADAS_POR_DIA), después las actas pendientes (como mucho
 * MAX_ACTAS_POR_DIA, sin la del PALMA), con una pausa entre peticiones. Al
 * primer error se para. Devuelve { jornadas, actas } guardadas.
 */
async function actualizar({ log = console, pausa = pausaPorDefecto, pausaMs = PAUSA_MS } = {}) {
  const hecho = { jornadas: [], actas: 0 };
  const plantilla = await plantillaLiga();
  if (!plantilla) return hecho;
  const competicion = {
    codPrimaria: plantilla.codigo_primaria,
    codGrupo: plantilla.codigo_grupo,
    codCompeticion: plantilla.codigo_competicion,
    codTemporada: plantilla.codigo_temporada
  };
  const idPlantilla = plantilla.id;
  let peticiones = 0;
  const esperarTurno = async () => {
    if (peticiones++ > 0) await pausa(pausaMs + Math.floor(Math.random() * pausaMs / 2));
  };

  try {
    // Jornadas ya jugadas: las que tienen la clasificación guardada.
    const jugadas = [...new Set((await Clasificacion.findAll({
      where: { id_plantilla: idPlantilla }, attributes: ['jornada'], raw: true
    }) || []).map((c) => Number(c.jornada)))].sort((a, b) => a - b);
    // Jornadas ya copiadas: algún partido con los códigos de equipo de RFAF
    // (el que crea "Finalizar Acta" no los lleva).
    const copiadas = new Set((await LigaPartido.findAll({
      where: { id_plantilla: idPlantilla, codigo_equipo_local: { [Op.ne]: null } }, attributes: ['jornada'], raw: true
    }) || []).map((p) => Number(p.jornada)));

    for (const jornada of jugadas.filter((j) => !copiadas.has(j)).slice(0, MAX_JORNADAS_POR_DIA)) {
      await esperarTurno();
      const datos = await rfafActa.leerJornada(competicion, jornada);
      if (datos.jornada != null && Number(datos.jornada) !== jornada) {
        throw new Error(`RFAF ha devuelto la jornada ${datos.jornada} en lugar de la ${jornada}.`);
      }
      const filas = (datos.partidos || []).map((p) => ({ ...p, id_plantilla: idPlantilla, jornada }));
      await LigaPartido.bulkCreate(filas, {
        updateOnDuplicate: ['jornada', 'fecha', 'hora', 'equipo_local', 'codigo_equipo_local', 'equipo_visitante', 'codigo_equipo_visitante']
      });
      hecho.jornadas.push(jornada);
      log.log(`⚽ Liga ${CATEGORIA_LIGA}: jornada ${jornada} copiada (${filas.length} partidos).`);
    }

    const pendientes = (await LigaPartido.findAll({
      where: { id_plantilla: idPlantilla, acta_at: null, intentos: { [Op.lt]: MAX_INTENTOS } },
      order: [['jornada', 'ASC'], ['id', 'ASC']]
    }) || []).filter((p) => !esPalma(p.equipo_local) && !esPalma(p.equipo_visitante)).slice(0, MAX_ACTAS_POR_DIA);

    for (const p of pendientes) {
      await esperarTurno();
      let acta;
      try {
        acta = await rfafActa.leerActa(competicion.codPrimaria, p.codigo_acta);
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
      await guardarActa(p, acta);
      hecho.actas += 1;
    }
    if (hecho.actas) log.log(`⚽ Liga ${CATEGORIA_LIGA}: ${hecho.actas} actas guardadas.`);
  } catch (err) {
    log.warn(`⚠️  Liga ${CATEGORIA_LIGA}: ${err.message} (se sigue mañana).`);
  }
  return hecho;
}

module.exports = {
  guardarActa, guardarActaDelPalma, actualizar, plantillaLiga,
  CATEGORIA_LIGA, MAX_JORNADAS_POR_DIA, MAX_ACTAS_POR_DIA, MAX_INTENTOS
};
