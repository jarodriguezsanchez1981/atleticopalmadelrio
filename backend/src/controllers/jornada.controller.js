const { Jornada, Equipo, Plantilla, Categoria, Temporada, Partido } = require('../models');
const { categoriaDelUsuario, includesConCategoria } = require('../utils/filtroCategoria');

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
  }
];

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
      include: includes
    });
    if (!item) return res.status(404).json({ message: 'Registro de calendario no encontrado.' });
    res.json(item);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { id_plantilla, id_equipo_local, id_equipo_visitante, jornada, fecha, hora } = req.body;
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
      id_plantilla, id_equipo_local, id_equipo_visitante, jornada, fecha, hora: hora || null
    });

    // Crear partido correspondiente para esta jornada
    const idUsuario = req.user?.id;
    await Partido.create({
      id_plantilla, fecha, id_lugar: null, id_equipo_local, id_equipo_visitante,
      id_usuario: idUsuario, incidencias: null
    });

    const respuesta = await Jornada.findOne({ where: { id: creado.id }, include: includes });
    res.status(201).json(respuesta);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const item = await Jornada.findOne({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ message: 'Registro de calendario no encontrado.' });
    const { id_plantilla, id_equipo_local, id_equipo_visitante, jornada, fecha, hora } = req.body;
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
    await item.save();
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

module.exports = { listar, obtener, crear, actualizar, eliminar };
