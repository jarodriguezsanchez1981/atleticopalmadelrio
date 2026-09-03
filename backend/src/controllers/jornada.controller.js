const { Jornada, JornadaJugador, Equipo, EquipoJugador, Plantilla, Categoria, Temporada, Partido, Jugador, Sancion } = require('../models');
const { categoriaDelUsuario, includesConCategoria } = require('../utils/filtroCategoria');

const PALMA_ID = 73;

const includes = [
  {
    model: Plantilla,
    as: 'plantilla',
    include: [
      { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'alias'] },
      { model: Temporada, as: 'temporada', attributes: ['id', 'nombre'] }
    ]
  },
  {
    model: Equipo,
    as: 'equipoLocal',
    attributes: ['id', 'nombre']
  },
  {
    model: Equipo,
    as: 'equipoVisitante',
    attributes: ['id', 'nombre']
  },
  {
    model: JornadaJugador,
    as: 'jornadaJugadores',
    attributes: ['id_jugador', 'id_equipo_jugador', 'es_local', 'tarjeta_amarilla', 'tarjeta_roja', 'goles'],
    include: [
      { model: Jugador, as: 'jugador', attributes: ['id', 'nombre', 'apellidos', 'foto'] },
      { model: EquipoJugador, as: 'equipoJugador', attributes: ['id', 'nombre', 'apellidos'] }
    ]
  }
];

/** Detalle: incluye escudo de los equipos para la vista de detalle. */
const includesDetalle = [
  {
    model: Plantilla,
    as: 'plantilla',
    include: [
      { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'alias'] },
      { model: Temporada, as: 'temporada', attributes: ['id', 'nombre'] }
    ]
  },
  { model: Equipo, as: 'equipoLocal', attributes: ['id', 'nombre', 'escudo'] },
  { model: Equipo, as: 'equipoVisitante', attributes: ['id', 'nombre', 'escudo'] },
  {
    model: JornadaJugador,
    as: 'jornadaJugadores',
    attributes: ['id_jugador', 'id_equipo_jugador', 'es_local', 'tarjeta_amarilla', 'tarjeta_roja', 'goles'],
    include: [
      { model: Jugador, as: 'jugador', attributes: ['id', 'nombre', 'apellidos', 'foto'] },
      { model: EquipoJugador, as: 'equipoJugador', attributes: ['id', 'nombre', 'apellidos'] }
    ]
  }
];

/** Guarda los jugadores convocados de una jornada (local y visitante). */
async function guardarJugadores(idJornada, jugadoresLocal, jugadoresVisitante) {
  await JornadaJugador.destroy({ where: { id_jornada: idJornada } });
  const filas = [];
  const anadir = (j, esLocal) => {
    filas.push({
      id_jornada: idJornada,
      id_jugador: j.id_jugador ?? null,
      id_equipo_jugador: j.id_equipo_jugador ?? null,
      es_local: esLocal,
      tarjeta_amarilla: j.tarjeta_amarilla || 0,
      tarjeta_roja: j.tarjeta_roja || 0,
      goles: j.goles || 0
    });
  };
  (jugadoresLocal || []).forEach((j) => anadir(j, true));
  (jugadoresVisitante || []).forEach((j) => anadir(j, false));
  if (filas.length) {
    await JornadaJugador.bulkCreate(filas, { ignoreDuplicates: true });
  }
}

/**
 * Crea/actualiza sanciones para los jugadores del PALMA DEL RIO ATLETICO C.F.
 * (id 73) que tengan tarjetas en la jornada, ligadas al partido de la jornada.
 */
async function sincronizarSanciones(jornada, jugadoresLocal, jugadoresVisitante) {
  const partido = await Partido.findOne({ where: { id_plantilla: jornada.id_plantilla, fecha: jornada.fecha } });
  if (!partido) return;

  const esPalmaLocal = Number(jornada.id_equipo_local) === PALMA_ID;
  const esPalmaVisitante = Number(jornada.id_equipo_visitante) === PALMA_ID;

  const palmaJugadores = [];
  if (esPalmaLocal) {
    (jugadoresLocal || []).forEach((j) => palmaJugadores.push({
      id_jugador: j.id_jugador, amarilla: Number(j.tarjeta_amarilla) || 0, roja: Number(j.tarjeta_roja) || 0
    }));
  }
  if (esPalmaVisitante) {
    (jugadoresVisitante || []).forEach((j) => palmaJugadores.push({
      id_jugador: j.id_jugador, amarilla: Number(j.tarjeta_amarilla) || 0, roja: Number(j.tarjeta_roja) || 0
    }));
  }

  for (const pj of palmaJugadores) {
    const existente = await Sancion.findOne({ where: { id_partido: partido.id, id_jugador: pj.id_jugador } });
    if (pj.amarilla <= 0 && pj.roja <= 0) {
      if (existente) await existente.destroy();
      continue;
    }
    if (existente) {
      existente.amarilla = pj.amarilla;
      existente.roja = pj.roja;
      await existente.save();
    } else {
      await Sancion.create({ id_partido: partido.id, id_jugador: pj.id_jugador, amarilla: pj.amarilla, roja: pj.roja });
    }
  }
}

async function listar(req, res, next) {
  try {
    const { id_plantilla, jornada } = req.query;
    const where = {};
    if (id_plantilla) where.id_plantilla = id_plantilla;
    if (jornada) where.jornada = jornada;
    const items = await Jornada.findAll({
      where,
      include: includesConCategoria(includes, categoriaDelUsuario(req)),
      order: [['fecha', 'ASC'], ['jornada', 'ASC']]
    });
    res.json(items);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const item = await Jornada.findOne({
      where: { id: req.params.id },
      include: includesDetalle
    });
    if (!item) return res.status(404).json({ message: 'Registro de calendario no encontrado.' });
    res.json(item);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { id_plantilla, id_equipo_local, id_equipo_visitante, jornada, fecha, hora, incidencias, observaciones, jugadores_local, jugadores_visitante } = req.body;
    if (!id_plantilla || !id_equipo_local || !id_equipo_visitante || !jornada || !fecha) {
      return res.status(400).json({ message: 'Plantilla, equipo local, equipo visitante, jornada y fecha son obligatorios.' });
    }
    if (id_equipo_local === id_equipo_visitante) {
      return res.status(400).json({ message: 'El equipo local y el visitante no pueden ser el mismo.' });
    }
    const plantilla = await Plantilla.findOne({ where: { id: id_plantilla } });
    if (!plantilla) return res.status(400).json({ message: 'La plantilla indicada no existe.' });
    const local = await Equipo.findOne({ where: { id: id_equipo_local } });
    if (!local) return res.status(400).json({ message: 'El equipo local indicado no existe.' });
    const visitante = await Equipo.findOne({ where: { id: id_equipo_visitante } });
    if (!visitante) return res.status(400).json({ message: 'El equipo visitante indicado no existe.' });
    if (!Number.isInteger(jornada) || jornada <= 0) {
      return res.status(400).json({ message: 'La jornada debe ser un número entero positivo.' });
    }

    // VALIDAR: Solo 1 jornada por plantilla por fecha
    const duplicada = await Jornada.findOne({ where: { id_plantilla, fecha } });
    if (duplicada) {
      return res.status(409).json({ message: 'Esta plantilla ya tiene una jornada programada para esa fecha.' });
    }

    const creado = await Jornada.create({
      id_plantilla, id_equipo_local, id_equipo_visitante, jornada, fecha, hora: hora || null,
      incidencias: incidencias || null, observaciones: observaciones || null
    });

    // Crear partido correspondiente para esta jornada
    const idUsuario = req.user?.id;
    await Partido.create({
      id_plantilla, fecha, id_lugar: null, id_equipo_local, id_equipo_visitante,
      id_usuario: idUsuario, incidencias: null
    });

    await guardarJugadores(creado.id, jugadores_local, jugadores_visitante);
    await sincronizarSanciones(creado, jugadores_local, jugadores_visitante);

    const respuesta = await Jornada.findOne({ where: { id: creado.id }, include: includes });
    res.status(201).json(respuesta);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const item = await Jornada.findOne({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ message: 'Registro de calendario no encontrado.' });
    const { id_plantilla, id_equipo_local, id_equipo_visitante, jornada, fecha, hora, incidencias, observaciones, jugadores_local, jugadores_visitante } = req.body;
    if (id_equipo_local && id_equipo_visitante && id_equipo_local === id_equipo_visitante) {
      return res.status(400).json({ message: 'El equipo local y el visitante no pueden ser el mismo.' });
    }
    if (id_plantilla !== undefined) {
      const plantilla = await Plantilla.findOne({ where: { id: id_plantilla } });
      if (!plantilla) return res.status(400).json({ message: 'La plantilla indicada no existe.' });
      item.id_plantilla = id_plantilla;
    }
    if (id_equipo_local !== undefined) {
      const local = await Equipo.findOne({ where: { id: id_equipo_local } });
      if (!local) return res.status(400).json({ message: 'El equipo local indicado no existe.' });
      item.id_equipo_local = id_equipo_local;
    }
    if (id_equipo_visitante !== undefined) {
      const visitante = await Equipo.findOne({ where: { id: id_equipo_visitante } });
      if (!visitante) return res.status(400).json({ message: 'El equipo visitante indicado no existe.' });
      item.id_equipo_visitante = id_equipo_visitante;
    }
    if (jornada !== undefined) {
      if (!Number.isInteger(jornada) || jornada <= 0) {
        return res.status(400).json({ message: 'La jornada debe ser un número entero positivo.' });
      }
      item.jornada = jornada;
    }
    if (fecha !== undefined) {
      item.fecha = fecha;
    }
    if (hora !== undefined) {
      item.hora = hora || null;
    }
    if (incidencias !== undefined) {
      item.incidencias = incidencias || null;
    }
    if (observaciones !== undefined) {
      item.observaciones = observaciones || null;
    }
    await item.save();
    if (jugadores_local !== undefined || jugadores_visitante !== undefined) {
      await guardarJugadores(item.id, jugadores_local, jugadores_visitante);
      await sincronizarSanciones(item, jugadores_local, jugadores_visitante);
    }
    const actualizado = await Jornada.findOne({ where: { id: item.id }, include: includes });
    res.json(actualizado);
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const jornadaId = req.params.id;

    // Obtener la jornada para saber id_plantilla y fecha
    const jornada = await Jornada.findOne({ where: { id: jornadaId } });
    if (!jornada) return res.status(404).json({ message: 'Registro de calendario no encontrado.' });

    // Eliminar partidos de esta jornada (misma plantilla + fecha)
    await Partido.destroy({ where: { id_plantilla: jornada.id_plantilla, fecha: jornada.fecha } });

    // Eliminar la jornada
    await jornada.destroy();
    res.status(204).send();
  } catch (err) { next(err); }
}

async function listarNumeros(req, res, next) {
  try {
    const { id_plantilla } = req.query;
    const where = {};
    if (id_plantilla) where.id_plantilla = id_plantilla;
    const items = await Jornada.findAll({
      where,
      attributes: ['jornada'],
      group: ['jornada'],
      order: [['jornada', 'ASC']]
    });
    res.json(items.map(i => i.jornada).filter(Boolean));
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar, listarNumeros };
