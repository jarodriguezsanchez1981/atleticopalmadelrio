const { Op } = require('sequelize');
const { Entrenamiento, Categoria } = require('../models');

async function listar(req, res, next) {
  try {
    const { id_categoria, desde, hasta } = req.query;
    const where = {};
    if (id_categoria) where.id_categoria = id_categoria;
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha[Op.gte] = new Date(desde);
      if (hasta) where.fecha[Op.lte] = new Date(hasta);
    }
    const entrenamientos = await Entrenamiento.findAll({
      where,
      include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'temporada'] }],
      order: [['fecha', 'ASC']]
    });
    res.json(entrenamientos);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const entrenamiento = await Entrenamiento.findByPk(req.params.id, {
      include: [{ model: Categoria, as: 'categoria' }]
    });
    if (!entrenamiento) return res.status(404).json({ message: 'Entrenamiento no encontrado.' });
    res.json(entrenamiento);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { id_categoria, fecha, lugar, incidencias } = req.body;
    if (!id_categoria || !fecha || !lugar) {
      return res.status(400).json({ message: 'Categoría, fecha y lugar son obligatorios.' });
    }
    const entrenamiento = await Entrenamiento.create({ id_categoria, fecha, lugar, incidencias });
    res.status(201).json(entrenamiento);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const entrenamiento = await Entrenamiento.findByPk(req.params.id);
    if (!entrenamiento) return res.status(404).json({ message: 'Entrenamiento no encontrado.' });
    const { id_categoria, fecha, lugar, incidencias } = req.body;
    if (id_categoria !== undefined) entrenamiento.id_categoria = id_categoria;
    if (fecha !== undefined) entrenamiento.fecha = fecha;
    if (lugar !== undefined) entrenamiento.lugar = lugar;
    if (incidencias !== undefined) entrenamiento.incidencias = incidencias;
    await entrenamiento.save();
    res.json(entrenamiento);
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Entrenamiento.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Entrenamiento no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
