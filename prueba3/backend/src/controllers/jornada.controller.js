const { Jornada, Categoria, Equipo, Temporada } = require('../models');

const includes = [
  {
    model: Categoria,
    as: 'categoria',
    attributes: ['id', 'nombre']
  },
  {
    model: Temporada,
    as: 'temporada',
    attributes: ['id', 'nombre']
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
    const { id_categoria, jornada } = req.query;
    const where = {};
    if (id_categoria) where.id_categoria = id_categoria;
    if (jornada) where.jornada = jornada;
    const items = await Jornada.findAll({
      where,
      include: includes,
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
    const { id_categoria, id_temporada, id_equipo_local, id_equipo_visitante, jornada, fecha, hora } = req.body;
    if (!id_categoria || !id_temporada || !id_equipo_local || !id_equipo_visitante || !jornada || !fecha) {
      return res.status(400).json({ message: 'Temporada, categoría, equipo local, equipo visitante, jornada y fecha son obligatorios.' });
    }
    if (id_equipo_local === id_equipo_visitante) {
      return res.status(400).json({ message: 'El equipo local y el visitante no pueden ser el mismo.' });
    }
    const categoria = await Categoria.findOne({ where: { id: id_categoria } });
    if (!categoria) return res.status(400).json({ message: 'La categoría indicada no existe.' });
    const temporada = await Temporada.findOne({ where: { id: id_temporada } });
    if (!temporada) return res.status(400).json({ message: 'La temporada indicada no existe.' });
    const local = await Equipo.findOne({ where: { id: id_equipo_local } });
    if (!local) return res.status(400).json({ message: 'El equipo local indicado no existe.' });
    const visitante = await Equipo.findOne({ where: { id: id_equipo_visitante } });
    if (!visitante) return res.status(400).json({ message: 'El equipo visitante indicado no existe.' });
    if (!Number.isInteger(jornada) || jornada <= 0) {
      return res.status(400).json({ message: 'La jornada debe ser un número entero positivo.' });
    }
    const creado = await Jornada.create({
      id_temporada, id_categoria, id_equipo_local, id_equipo_visitante, jornada, fecha, hora: hora || null
    });
    const respuesta = await Jornada.findOne({ where: { id: creado.id }, include: includes });
    res.status(201).json(respuesta);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const item = await Jornada.findOne({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ message: 'Registro de calendario no encontrado.' });
    const { id_categoria, id_temporada, id_equipo_local, id_equipo_visitante, jornada, fecha, hora } = req.body;
    if (id_equipo_local && id_equipo_visitante && id_equipo_local === id_equipo_visitante) {
      return res.status(400).json({ message: 'El equipo local y el visitante no pueden ser el mismo.' });
    }
    if (id_temporada !== undefined) {
      const temporada = await Temporada.findOne({ where: { id: id_temporada } });
      if (!temporada) return res.status(400).json({ message: 'La temporada indicada no existe.' });
      item.id_temporada = id_temporada;
    }
    if (id_categoria !== undefined) {
      const categoria = await Categoria.findOne({ where: { id: id_categoria } });
      if (!categoria) return res.status(400).json({ message: 'La categoría indicada no existe.' });
      item.id_categoria = id_categoria;
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
    const eliminado = await Jornada.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Registro de calendario no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
