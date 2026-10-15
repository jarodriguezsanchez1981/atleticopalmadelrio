const { UniqueConstraintError, Op } = require('sequelize');
const { Clasificacion, Partido, Plantilla, Categoria, Temporada } = require('../models');
const rfafActa = require('../utils/rfafActa');
const { diaEspana, partesEspana } = require('../utils/horaEspana');

/**
 * Estadísticas → Clasificación: la clasificación de la liga jornada a jornada.
 * Se copia sola de RFAF (NFG_VisClasificacion) el día siguiente al partido de
 * cada jornada a las 12:00 (utils/clasificacionAutomatica.js) y se guarda en
 * `clasificaciones` para no volver a pedirla a rfaf.es.
 */

// Hora española a partir de la cual se copia la clasificación el día siguiente al partido.
const HORA_ACTUALIZACION = 12;

/** Códigos de la competición de RFAF de una plantilla (en sus columnas
 * codigo_primaria/codigo_grupo/codigo_competicion, que se rellenan al crear o
 * editar la plantilla y cambian cada temporada; están en la URL de la
 * clasificación en rfaf.es). null si le falta alguno: esa plantilla no tiene
 * clasificación configurada. */
function competicionDe(plantilla) {
  const codPrimaria = plantilla?.codigo_primaria;
  const codGrupo = plantilla?.codigo_grupo;
  const codCompeticion = plantilla?.codigo_competicion;
  return codPrimaria && codGrupo && codCompeticion ? { codPrimaria, codGrupo, codCompeticion } : null;
}

const CAMPOS_PALMA = ['posicion', 'puntos', 'jugados', 'ganados', 'empatados', 'perdidos', 'goles_favor', 'goles_contra'];

// En RFAF también está "LA PALMA C.F." (otro club distinto): el nuestro se
// reconoce porque lleva a la vez "PALMA DEL RIO" y "ATLETICO", en el orden que
// sea ("PALMA DEL RIO ATLETICO C.F." o "ATLETICO PALMA DEL RIO C.F." según la
// competición de RFAF).
const esPalma = (nombre) => {
  const n = String(nombre || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  return n.includes('PALMA DEL RIO') && n.includes('ATLETICO');
};

/** 'YYYY-MM-DD' + días. */
function sumarDias(dia, dias) {
  const [y, m, d] = dia.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** Día del partido tal y como está guardado (hora española en la BD). */
const diaPartido = (fecha) => new Date(fecha).toISOString().slice(0, 10);

const formatoDia = (dia) => dia.split('-').reverse().join('/');

/** true si ya ha llegado el día `desde` a las 12:00 (hora española). */
function haLlegado(desde) {
  if (!desde) return false;
  const ahora = new Date();
  const hoy = diaEspana(ahora);
  return hoy > desde || (hoy === desde && partesEspana(ahora).h >= HORA_ACTUALIZACION);
}

/**
 * Siguiente jornada por guardar: la primera de la liga (1, 2, …) que todavía no
 * está en la tabla. Se puede guardar desde el día siguiente a su partido a las
 * 12:00; una jornada sin partido del PALMA (descansa), una semana después que
 * la anterior. null si ya están todas.
 */
async function siguienteJornada(idPlantilla, guardadas) {
  const partidos = await Partido.findAll({ where: { id_plantilla: idPlantilla }, attributes: ['jornada', 'fecha'] }) || [];
  const diaDeJornada = new Map();
  for (const p of partidos) {
    const j = Number(p.jornada);
    if (j > 0 && p.fecha && !diaDeJornada.has(j)) diaDeJornada.set(j, diaPartido(p.fecha));
  }
  if (!diaDeJornada.size) return null;
  const ultima = Math.max(...diaDeJornada.keys());
  let desde = null;
  for (let j = 1; j <= ultima; j++) {
    if (diaDeJornada.has(j)) desde = sumarDias(diaDeJornada.get(j), 1);
    else if (desde) desde = sumarDias(desde, 7);
    if (!guardadas.has(j)) return { jornada: j, desde, disponible: haLlegado(desde) };
  }
  return null;
}

/** GET /estadisticas/clasificacion?id_plantilla= */
async function listar(req, res, next) {
  try {
    const idPlantilla = Number(req.query.id_plantilla);
    if (!idPlantilla) return res.status(400).json({ message: 'Indica la plantilla.' });

    const filas = await Clasificacion.findAll({
      where: { id_plantilla: idPlantilla },
      order: [['jornada', 'ASC'], ['posicion', 'ASC']],
      raw: true
    }) || [];
    const porJornada = new Map();
    for (const f of filas) {
      if (!porJornada.has(f.jornada)) porJornada.set(f.jornada, { jornada: f.jornada, fecha: f.fecha, equipos: [] });
      porJornada.get(f.jornada).equipos.push(f);
    }
    // Por jornada, solo la fila del PALMA y el número de equipos; la tabla
    // completa, de la última jornada guardada.
    const jornadas = [...porJornada.values()].map(({ jornada, fecha, equipos }) => {
      const palma = equipos.find((e) => e.es_palma);
      return {
        jornada,
        fecha,
        total_equipos: equipos.length,
        palma: palma ? Object.fromEntries(CAMPOS_PALMA.map((c) => [c, palma[c]])) : null
      };
    });
    const ultima = [...porJornada.values()].pop() || null;
    const siguiente = await siguienteJornada(idPlantilla, new Set(porJornada.keys()));
    res.json({ jornadas, ultima, siguiente });
  } catch (err) { next(err); }
}

/** Error de una actualización: se registra en el log y se deja para la
 * siguiente (sin reintentos contra rfaf.es). */
const fallo = (message) => Object.assign(new Error(message), { esperado: true });

/**
 * Guarda la siguiente jornada pendiente de la plantilla (con su categoría)
 * leyéndola de RFAF: una petición. Devuelve { jornada, posicion, puntos,
 * total_equipos }, o null si no hay ninguna disponible todavía.
 */
async function guardarSiguiente(plantilla) {
  const competicion = competicionDe(plantilla);
  if (!competicion) throw fallo(`La categoría ${plantilla.categoria?.nombre} no tiene configurada su clasificación de RFAF (faltan los códigos en la plantilla).`);
  const idPlantilla = plantilla.id;

  const guardadas = await Clasificacion.findAll({ where: { id_plantilla: idPlantilla }, attributes: ['jornada'], raw: true }) || [];
  const siguiente = await siguienteJornada(idPlantilla, new Set(guardadas.map((g) => g.jornada)));
  if (!siguiente?.disponible) return null;

  const datos = await rfafActa.leerClasificacion(competicion, siguiente.jornada);
  if (datos.jornada != null && Number(datos.jornada) !== siguiente.jornada) {
    throw fallo(`RFAF ha devuelto la jornada ${datos.jornada} en lugar de la ${siguiente.jornada}.`);
  }
  // La fecha de RFAF manda (p. ej. una jornada aplazada o entre semana).
  if (datos.fecha && diaEspana(new Date()) <= datos.fecha) {
    throw fallo(`La jornada ${siguiente.jornada} se juega el ${formatoDia(datos.fecha)}: todavía no se guarda.`);
  }
  const equipos = (datos.equipos || []).map((e) => ({
    ...e,
    id_plantilla: idPlantilla,
    jornada: siguiente.jornada,
    fecha: datos.fecha || null,
    es_palma: esPalma(e.equipo)
  }));
  const palma = equipos.find((e) => e.es_palma);
  if (!palma) throw fallo('El PALMA no aparece en la clasificación de RFAF.');

  try {
    await Clasificacion.bulkCreate(equipos);
  } catch (err) {
    if (err instanceof UniqueConstraintError) throw fallo(`La jornada ${siguiente.jornada} ya está guardada.`);
    throw err;
  }
  return { jornada: siguiente.jornada, posicion: palma.posicion, puntos: palma.puntos, total_equipos: equipos.length };
}

/**
 * Pone al día la clasificación de todas las plantillas de la temporada actual
 * con competición de RFAF: guarda una tras otra las jornadas ya disponibles.
 * Al primer fallo de una plantilla se para (se vuelve a intentar en la
 * siguiente actualización). Devuelve las jornadas guardadas.
 */
async function actualizarTodas(log = console) {
  const plantillas = await Plantilla.findAll({
    // Solo las plantillas de la temporada actual con su competición de RFAF
    // configurada (los tres códigos en la plantilla).
    where: {
      codigo_primaria: { [Op.ne]: null },
      codigo_grupo: { [Op.ne]: null },
      codigo_competicion: { [Op.ne]: null }
    },
    include: [
      { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
      { model: Temporada, as: 'temporada', attributes: ['id', 'actual'], where: { actual: true } }
    ]
  }) || [];
  const guardadas = [];
  for (const plantilla of plantillas) {
    try {
      let r;
      while ((r = await guardarSiguiente(plantilla))) {
        guardadas.push({ id_plantilla: plantilla.id, ...r });
        log.log(`📊 Clasificación ${plantilla.categoria.nombre} jornada ${r.jornada}: PALMA ${r.posicion}º de ${r.total_equipos} (${r.puntos} pts).`);
      }
    } catch (err) {
      log.warn(`⚠️  Clasificación ${plantilla.categoria?.nombre}: ${err.message}`);
    }
  }
  return guardadas;
}

module.exports = { listar, guardarSiguiente, actualizarTodas, siguienteJornada, esPalma, competicionDe, HORA_ACTUALIZACION };
