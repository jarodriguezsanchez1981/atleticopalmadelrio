const { Promocion, Plantilla, Categoria, Temporada, Jugador, PartidoJugador, Partido, TipoFutbol, Equipo } = require('../models');

const PALMA_ID = 73;

const includes = [
  {
    model: Plantilla,
    as: 'plantilla',
    attributes: ['id', 'id_categoria', 'id_temporada', 'id_division'],
    include: [
      { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'orden'] },
      { model: Temporada, as: 'temporada', attributes: ['id', 'nombre'] }
    ]
  },
  { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'orden'] },
  { model: Jugador, as: 'jugador', attributes: ['id', 'nombre', 'apellidos', 'foto'] }
];

function serializePromocion(promocion) {
  return promocion.toJSON ? promocion.toJSON() : promocion;
}

async function listar(req, res, next) {
  try {
    const promociones = await Promocion.findAll({
      include: includes,
      order: [['id', 'ASC']]
    });
    res.json(promociones.map(serializePromocion));
  } catch (err) { next(err); }
}

/** Mismo grupo numérico de categoría; sin grupo no hay coincidencia. */
function mismoGrupo(a, b) {
  return a != null && b != null && Number(a) === Number(b);
}

/** Promociones con el número de partidos de la temporada que cada jugador ha
 * jugado con una plantilla que no es la suya (la de la promoción):
 * - promocion_rfaf: la categoría de ese partido es del mismo grupo que la suya.
 * - promocion_categoria: es de otro grupo (o alguna de las dos no tiene grupo).
 * En `partidos`, esos partidos por fecha: categoría, rival, marcador, tipo
 * ('rfaf' | 'categoria') y lo que hizo el jugador (goles, tarjetas, minutos). */
async function resumen(req, res, next) {
  try {
    const promociones = await Promocion.findAll({
      include: [
        {
          model: Plantilla,
          as: 'plantilla',
          attributes: ['id', 'id_categoria', 'id_temporada'],
          include: [
            {
              model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'grupo', 'orden', 'id_tipofutbol'],
              include: [{ model: TipoFutbol, as: 'tipofutbol', attributes: ['id', 'nombre'] }]
            },
            { model: Temporada, as: 'temporada', attributes: ['id', 'nombre'] }
          ]
        },
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'grupo', 'orden'] },
        { model: Jugador, as: 'jugador', attributes: ['id', 'nombre', 'apellidos'] }
      ],
      order: [['id', 'ASC']]
    });
    const idsJugador = [...new Set(promociones.map((p) => p.id_jugador))];
    const jugados = idsJugador.length
      ? await PartidoJugador.findAll({
        where: { id_jugador: idsJugador },
        attributes: ['id_partido', 'id_jugador', 'goles', 'tarjeta_amarilla', 'tarjeta_roja', 'minutos'],
        include: [{
          model: Partido,
          as: 'partido',
          attributes: ['id', 'id_plantilla', 'fecha', 'jornada', 'id_equipo_local', 'id_equipo_visitante', 'resultado', 'suspendido'],
          include: [
            {
              model: Plantilla,
              as: 'plantilla',
              attributes: ['id', 'id_temporada'],
              include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'grupo'] }]
            },
            { model: Equipo, as: 'equipoLocal', attributes: ['id', 'nombre'] },
            { model: Equipo, as: 'equipoVisitante', attributes: ['id', 'nombre'] }
          ]
        }]
      })
      : [];

    const resultado = promociones.map((promocion) => {
      const origen = promocion.plantilla;
      const contados = new Set();
      let promocion_rfaf = 0;
      let promocion_categoria = 0;
      const partidos = [];
      for (const pj of jugados) {
        const partido = pj.partido;
        if (Number(pj.id_jugador) !== Number(promocion.id_jugador) || !partido) continue;
        if (Number(partido.id_plantilla) === Number(promocion.id_plantilla)) continue;
        if (Number(partido.plantilla?.id_temporada) !== Number(origen?.id_temporada)) continue;
        if (contados.has(partido.id)) continue;
        contados.add(partido.id);
        const tipo = mismoGrupo(partido.plantilla?.categoria?.grupo, origen?.categoria?.grupo) ? 'rfaf' : 'categoria';
        if (tipo === 'rfaf') promocion_rfaf += 1;
        else promocion_categoria += 1;
        const esLocal = Number(partido.id_equipo_local) === PALMA_ID;
        partidos.push({
          id_partido: partido.id,
          fecha: partido.fecha ?? null,
          jornada: partido.jornada ?? null,
          categoria: partido.plantilla?.categoria?.nombre || null,
          rival: (esLocal ? partido.equipoVisitante?.nombre : partido.equipoLocal?.nombre) || null,
          es_local: esLocal,
          resultado: partido.resultado ?? null,
          suspendido: !!partido.suspendido,
          tipo,
          goles: Number(pj.goles) || 0,
          tarjeta_amarilla: Number(pj.tarjeta_amarilla) || 0,
          tarjeta_roja: Number(pj.tarjeta_roja) || 0,
          minutos: pj.minutos ?? null
        });
      }
      partidos.sort((a, b) => new Date(a.fecha || 0) - new Date(b.fecha || 0));
      return { ...serializePromocion(promocion), promocion_rfaf, promocion_categoria, partidos };
    });
    res.json(resultado);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const promocion = await Promocion.findOne({ where: { id: req.params.id }, include: includes });
    if (!promocion) return res.status(404).json({ message: 'Promoción no encontrada.' });
    res.json(serializePromocion(promocion));
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { id_plantilla, id_categoria, id_jugador } = req.body;
    if (!id_plantilla || !id_categoria || !id_jugador) {
      return res.status(400).json({ message: 'Plantilla, categoría y jugador son obligatorios.' });
    }
    const plantilla = await Plantilla.findOne({ where: { id: id_plantilla } });
    if (!plantilla) return res.status(400).json({ message: 'La plantilla indicada no existe.' });
    const categoria = await Categoria.findOne({ where: { id: id_categoria } });
    if (!categoria) return res.status(400).json({ message: 'La categoría indicada no existe.' });
    const jugador = await Jugador.findOne({ where: { id: id_jugador } });
    if (!jugador) return res.status(400).json({ message: 'El jugador indicado no existe.' });

    const promocion = await Promocion.create({ id_plantilla, id_categoria, id_jugador });
    const completa = await Promocion.findOne({ where: { id: promocion.id }, include: includes });
    res.status(201).json(serializePromocion(completa));
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const promocion = await Promocion.findOne({ where: { id: req.params.id } });
    if (!promocion) return res.status(404).json({ message: 'Promoción no encontrada.' });
    const { id_plantilla, id_categoria, id_jugador } = req.body;
    if (id_plantilla !== undefined) {
      const plantilla = await Plantilla.findOne({ where: { id: id_plantilla } });
      if (!plantilla) return res.status(400).json({ message: 'La plantilla indicada no existe.' });
      promocion.id_plantilla = id_plantilla;
    }
    if (id_categoria !== undefined) {
      const categoria = await Categoria.findOne({ where: { id: id_categoria } });
      if (!categoria) return res.status(400).json({ message: 'La categoría indicada no existe.' });
      promocion.id_categoria = id_categoria;
    }
    if (id_jugador !== undefined) {
      const jugador = await Jugador.findOne({ where: { id: id_jugador } });
      if (!jugador) return res.status(400).json({ message: 'El jugador indicado no existe.' });
      promocion.id_jugador = id_jugador;
    }
    await promocion.save();
    const actualizada = await Promocion.findOne({ where: { id: promocion.id }, include: includes });
    res.json(serializePromocion(actualizada));
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Promocion.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Promoción no encontrada.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar, resumen };
