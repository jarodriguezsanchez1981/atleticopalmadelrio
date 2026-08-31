const { Division } = require('../models');

async function listar(req, res, next) {
  try {
    const divisiones = await Division.findAll({ order: [['nombre', 'ASC']] });
    res.json(divisiones);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const division = await Division.findOne({ where: { id: req.params.id } });
    if (!division) return res.status(404).json({ message: 'División no encontrada.' });
    res.json(division);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ message: 'El nombre es obligatorio.' });
    const division = await Division.create({ nombre });
    res.status(201).json(division);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const division = await Division.findOne({ where: { id: req.params.id } });
    if (!division) return res.status(404).json({ message: 'División no encontrada.' });
    const { nombre } = req.body;
    if (nombre !== undefined) division.nombre = nombre;
    await division.save();
    res.json(division);
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Division.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'División no encontrada.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };