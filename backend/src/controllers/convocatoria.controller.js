const {
  Convocatoria, ConvocatoriaJugador, Temporada, Plantilla, Categoria, Partido,
  Equipo, Jugador, PlantillaJugador, PartidoJugador
} = require('../models');
const { categoriaDelUsuario, includesConCategoria } = require('../utils/filtroCategoria');

const PALMA_ID = 73;

const includesBase = [
  { model: Temporada, as: 'temporada', attributes: ['id', 'nombre'] },
  {
    model: Plantilla,
    as: 'plantilla',
    attributes: ['id', 'id_categoria', 'id_temporada'],
    include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'alias'] }]
  },
  {
    model: Partido,
    as: 'partido',
    attributes: ['id', 'fecha', 'jornada', 'id_equipo_local', 'id_equipo_visitante'],
    include: [
      { model: Equipo, as: 'equipoLocal', attributes: ['id', 'nombre', 'escudo'] },
      { model: Equipo, as: 'equipoVisitante', attributes: ['id', 'nombre', 'escudo'] }
    ]
  },
  {
    model: ConvocatoriaJugador,
    as: 'jugadores',
    include: [{ model: Jugador, as: 'jugador', attributes: ['id', 'nombre', 'apellidos', 'foto'] }]
  }
];

function serialize(convocatoria) {
  return convocatoria.toJSON ? convocatoria.toJSON() : convocatoria;
}

async function listar(req, res, next) {
  try {
    const { id_temporada, id_plantilla, id_partido } = req.query;
    const where = {};
    if (id_temporada) where.id_temporada = id_temporada;
    if (id_plantilla) where.id_plantilla = id_plantilla;
    if (id_partido) where.id_partido = id_partido;

    const items = await Convocatoria.findAll({
      where,
      include: includesConCategoria(includesBase, categoriaDelUsuario(req)),
      order: [['created_at', 'DESC']]
    });
    res.json(items.map(serialize));
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const item = await Convocatoria.findByPk(req.params.id, { include: includesBase });
    if (!item) return res.status(404).json({ message: 'Convocatoria no encontrada.' });
    res.json(serialize(item));
  } catch (err) { next(err); }
}

/** Valida temporada/plantilla/partido y que sean coherentes entre sí. Devuelve
 * el partido cargado (para saber si el PALMA es local o visitante) o un mensaje
 * de error. */
async function validarReferencias({ id_temporada, id_plantilla, id_partido }) {
  if (!id_temporada || !id_plantilla || !id_partido) {
    return { error: 'Temporada, plantilla y partido son obligatorios.' };
  }
  const temporada = await Temporada.findByPk(id_temporada);
  if (!temporada) return { error: 'La temporada indicada no existe.' };

  const plantilla = await Plantilla.findByPk(id_plantilla);
  if (!plantilla) return { error: 'La plantilla indicada no existe.' };
  if (Number(plantilla.id_temporada) !== Number(id_temporada)) {
    return { error: 'La plantilla no pertenece a la temporada indicada.' };
  }

  const partido = await Partido.findByPk(id_partido);
  if (!partido) return { error: 'El partido indicado no existe.' };
  if (Number(partido.id_plantilla) !== Number(id_plantilla)) {
    return { error: 'El partido no pertenece a la plantilla indicada.' };
  }

  return { partido };
}

/** Los ids de jugador deben pertenecer a la plantilla convocada. */
async function jugadoresValidos(idPlantilla, idsJugador) {
  if (!idsJugador.length) return true;
  const filas = await PlantillaJugador.findAll({
    where: { id_plantilla: idPlantilla, id_jugador: idsJugador }
  });
  return filas.length === new Set(idsJugador).size;
}

/** Da de alta (sin pisar tarjetas/goles ya registrados) a los jugadores
 * convocados como jugadores del partido, del lado en el que juega el PALMA. */
async function sincronizarPartidoJugadores(partido, idsJugador) {
  const esLocal = Number(partido.id_equipo_local) === PALMA_ID;
  for (const idJugador of idsJugador) {
    await PartidoJugador.findOrCreate({
      where: { id_partido: partido.id, id_jugador: idJugador, es_local: esLocal },
      defaults: { id_partido: partido.id, id_jugador: idJugador, es_local: esLocal }
    });
  }
}

async function crear(req, res, next) {
  try {
    const { id_temporada, id_plantilla, id_partido, jugadores } = req.body;
    const { error, partido } = await validarReferencias({ id_temporada, id_plantilla, id_partido });
    if (error) return res.status(400).json({ message: error });

    const existente = await Convocatoria.findOne({ where: { id_partido } });
    if (existente) return res.status(409).json({ message: 'Este partido ya tiene una convocatoria.' });

    const idsJugador = [...new Set((jugadores || []).map(Number).filter(Boolean))];
    if (!(await jugadoresValidos(id_plantilla, idsJugador))) {
      return res.status(400).json({ message: 'Algún jugador convocado no pertenece a la plantilla.' });
    }

    const convocatoria = await Convocatoria.create({ id_temporada, id_plantilla, id_partido });
    if (idsJugador.length) {
      await ConvocatoriaJugador.bulkCreate(
        idsJugador.map((id_jugador) => ({ id_convocatoria: convocatoria.id, id_jugador })),
        { ignoreDuplicates: true }
      );
      await sincronizarPartidoJugadores(partido, idsJugador);
    }

    const completa = await Convocatoria.findByPk(convocatoria.id, { include: includesBase });
    res.status(201).json(serialize(completa));
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const convocatoria = await Convocatoria.findByPk(req.params.id);
    if (!convocatoria) return res.status(404).json({ message: 'Convocatoria no encontrada.' });

    const { jugadores } = req.body;
    if (jugadores === undefined) {
      const completa = await Convocatoria.findByPk(convocatoria.id, { include: includesBase });
      return res.json(serialize(completa));
    }

    const partido = await Partido.findByPk(convocatoria.id_partido);
    const idsJugador = [...new Set((jugadores || []).map(Number).filter(Boolean))];
    if (!(await jugadoresValidos(convocatoria.id_plantilla, idsJugador))) {
      return res.status(400).json({ message: 'Algún jugador convocado no pertenece a la plantilla.' });
    }

    // Se reemplaza la lista completa: no se tocan las filas de partido_jugadores
    // ya creadas (aunque el jugador salga de la convocatoria) para no perder
    // tarjetas/goles ya anotados.
    await ConvocatoriaJugador.destroy({ where: { id_convocatoria: convocatoria.id } });
    if (idsJugador.length) {
      await ConvocatoriaJugador.bulkCreate(
        idsJugador.map((id_jugador) => ({ id_convocatoria: convocatoria.id, id_jugador })),
        { ignoreDuplicates: true }
      );
      await sincronizarPartidoJugadores(partido, idsJugador);
    }

    const completa = await Convocatoria.findByPk(convocatoria.id, { include: includesBase });
    res.json(serialize(completa));
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminada = await Convocatoria.destroy({ where: { id: req.params.id } });
    if (!eliminada) return res.status(404).json({ message: 'Convocatoria no encontrada.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
