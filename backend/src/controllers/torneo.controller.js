const { Op } = require('sequelize');
const { Torneo, Plantilla, Categoria, Temporada, Equipo } = require('../models');

const includes = [
  {
    model: Plantilla,
    as: 'plantilla',
    attributes: ['id', 'id_categoria', 'id_temporada'],
    include: [
      { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'alias'] },
      { model: Temporada, as: 'temporada', attributes: ['id', 'nombre'] }
    ]
  },
  { model: Equipo, as: 'equipo', attributes: ['id', 'nombre', 'escudo'] }
];

async function listar(req, res, next) {
  try {
    const { id_plantilla, id_equipo, desde, hasta } = req.query;
    const where = {};
    if (id_plantilla) where.id_plantilla = id_plantilla;
    if (id_equipo) where.id_equipo = id_equipo;
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha[Op.gte] = String(desde).slice(0, 10);
      if (hasta) where.fecha[Op.lte] = String(hasta).slice(0, 10);
    }
    const items = await Torneo.findAll({
      where: Object.keys(where).length ? where : undefined,
      include: includes,
      order: [['fecha', 'ASC'], ['hora', 'ASC']]
    });
    res.json(items);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const item = await Torneo.findByPk(req.params.id, { include: includes });
    if (!item) return res.status(404).json({ message: 'Torneo no encontrado.' });
    res.json(item);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { id_plantilla, id_equipo, nombre, fecha, hora } = req.body;
    if (!id_plantilla || !id_equipo || !fecha) {
      return res.status(400).json({ message: 'Plantilla, equipo y fecha son obligatorios.' });
    }
    const plantilla = await Plantilla.findOne({ where: { id: id_plantilla } });
    if (!plantilla) return res.status(400).json({ message: 'La plantilla indicada no existe.' });
    const equipo = await Equipo.findOne({ where: { id: id_equipo } });
    if (!equipo) return res.status(400).json({ message: 'El equipo indicado no existe.' });
    const item = await Torneo.create({
      id_plantilla,
      id_equipo,
      nombre: nombre || null,
      fecha,
      hora: hora || null
    });
    const completo = await Torneo.findByPk(item.id, { include: includes });
    res.status(201).json(completo);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const item = await Torneo.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Torneo no encontrado.' });
    const { id_plantilla, id_equipo, nombre, fecha, hora } = req.body;
    if (id_plantilla !== undefined) {
      const plantilla = await Plantilla.findOne({ where: { id: id_plantilla } });
      if (!plantilla) return res.status(400).json({ message: 'La plantilla indicada no existe.' });
      item.id_plantilla = id_plantilla;
    }
    if (id_equipo !== undefined) {
      const equipo = await Equipo.findOne({ where: { id: id_equipo } });
      if (!equipo) return res.status(400).json({ message: 'El equipo indicado no existe.' });
      item.id_equipo = id_equipo;
    }
    if (nombre !== undefined) item.nombre = nombre || null;
    if (fecha !== undefined) item.fecha = fecha;
    if (hora !== undefined) item.hora = hora || null;
    await item.save();
    const completo = await Torneo.findByPk(item.id, { include: includes });
    res.json(completo);
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Torneo.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Torneo no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
