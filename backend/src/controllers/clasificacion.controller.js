const { UniqueConstraintError } = require('sequelize');
const { Clasificacion, Partido, Plantilla, Categoria, Temporada } = require('../models');
const rfafActa = require('../utils/rfafActa');
const { diaEspana } = require('../utils/horaEspana');

/**
 * Estadísticas → Clasificación: la clasificación de la liga jornada a jornada.
 * Se copia de RFAF (NFG_VisClasificacion) una jornada cada vez con el botón de
 * la sección, a partir del día siguiente al partido de esa jornada, y se
 * guarda en `clasificaciones` para no volver a pedirla a rfaf.es.
 */

// Competición de RFAF de cada categoría (temporada actual). Al empezar otra
// temporada RFAF da códigos nuevos: cambiarlos aquí (están en la URL de la
// clasificación en rfaf.es).
const COMPETICIONES_RFAF = {
  'Senior A': { codPrimaria: '1000120', codGrupo: '49641343', codCompeticion: '48466530' }
};

// En RFAF también está "LA PALMA C.F.": el nuestro se reconoce por el nombre completo.
const NOMBRE_PALMA = 'PALMA DEL RIO ATLETICO';
const CAMPOS_PALMA = ['posicion', 'puntos', 'jugados', 'ganados', 'empatados', 'perdidos', 'goles_favor', 'goles_contra'];

const esPalma = (nombre) => String(nombre || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()
  .startsWith(NOMBRE_PALMA);

/** 'YYYY-MM-DD' + días. */
function sumarDias(dia, dias) {
  const [y, m, d] = dia.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** Día del partido tal y como está guardado (hora española en la BD). */
const diaPartido = (fecha) => new Date(fecha).toISOString().slice(0, 10);

const formatoDia = (dia) => dia.split('-').reverse().join('/');

/**
 * Siguiente jornada por guardar: la primera de la liga (1, 2, …) que todavía no
 * está en la tabla. Se puede guardar desde el día siguiente a su partido; una
 * jornada sin partido del PALMA (descansa) se puede guardar una semana después
 * que la anterior. null si ya están todas.
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
  const hoy = diaEspana(new Date());
  let desde = null;
  for (let j = 1; j <= ultima; j++) {
    if (diaDeJornada.has(j)) desde = sumarDias(diaDeJornada.get(j), 1);
    else if (desde) desde = sumarDias(desde, 7);
    if (!guardadas.has(j)) return { jornada: j, desde, disponible: !!desde && hoy >= desde };
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

/** POST /estadisticas/clasificacion { id_plantilla }: guarda la siguiente
 * jornada pendiente (la decide el servidor) leyéndola de RFAF. */
async function guardarSiguiente(req, res, next) {
  try {
    const idPlantilla = Number(req.body?.id_plantilla);
    if (!idPlantilla) return res.status(400).json({ message: 'Indica la plantilla.' });

    const plantilla = await Plantilla.findByPk(idPlantilla, {
      include: [
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
        { model: Temporada, as: 'temporada', attributes: ['id', 'actual'] }
      ]
    });
    if (!plantilla) return res.status(404).json({ message: 'Plantilla no encontrada.' });
    const competicion = COMPETICIONES_RFAF[plantilla.categoria?.nombre];
    if (!competicion || !plantilla.temporada?.actual) {
      return res.status(400).json({ message: 'Esta plantilla no tiene configurada su clasificación de RFAF.' });
    }

    const guardadas = await Clasificacion.findAll({ where: { id_plantilla: idPlantilla }, attributes: ['jornada'], raw: true }) || [];
    const siguiente = await siguienteJornada(idPlantilla, new Set(guardadas.map((g) => g.jornada)));
    if (!siguiente) return res.status(409).json({ message: 'Ya están guardadas todas las jornadas.' });
    if (!siguiente.disponible) {
      return res.status(409).json({
        message: siguiente.desde
          ? `La clasificación de la jornada ${siguiente.jornada} se podrá guardar a partir del ${formatoDia(siguiente.desde)}.`
          : `Todavía no se puede guardar la clasificación de la jornada ${siguiente.jornada}.`
      });
    }

    let datos;
    try {
      datos = await rfafActa.leerClasificacion(competicion, siguiente.jornada);
    } catch (err) {
      return res.status(err.status || 502).json({ message: err.message });
    }
    if (datos.jornada != null && Number(datos.jornada) !== siguiente.jornada) {
      return res.status(502).json({ message: `RFAF ha devuelto la jornada ${datos.jornada} en lugar de la ${siguiente.jornada}.` });
    }
    // La fecha de RFAF manda (p. ej. una jornada de descanso entre semana).
    if (datos.fecha && diaEspana(new Date()) <= datos.fecha) {
      return res.status(409).json({
        message: `La jornada ${siguiente.jornada} se juega el ${formatoDia(datos.fecha)}: su clasificación se podrá guardar a partir del ${formatoDia(sumarDias(datos.fecha, 1))}.`
      });
    }
    const equipos = (datos.equipos || []).map((e) => ({
      ...e,
      id_plantilla: idPlantilla,
      jornada: siguiente.jornada,
      fecha: datos.fecha || null,
      es_palma: esPalma(e.equipo)
    }));
    const palma = equipos.find((e) => e.es_palma);
    if (!palma) return res.status(502).json({ message: 'El PALMA no aparece en la clasificación de RFAF.' });

    try {
      await Clasificacion.bulkCreate(equipos);
    } catch (err) {
      if (err instanceof UniqueConstraintError) {
        return res.status(409).json({ message: `La jornada ${siguiente.jornada} ya está guardada.` });
      }
      throw err;
    }
    res.status(201).json({ jornada: siguiente.jornada, posicion: palma.posicion, puntos: palma.puntos, total_equipos: equipos.length });
  } catch (err) { next(err); }
}

module.exports = { listar, guardarSiguiente, siguienteJornada, esPalma, COMPETICIONES_RFAF };
