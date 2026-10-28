const { Posicion } = require('../models');

async function listar(req, res, next) {
  try {
    const posiciones = await Posicion.findAll({ order: [['nombre', 'ASC']] });
    res.json(posiciones);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const posicion = await Posicion.findOne({ where: { id: req.params.id } });
    if (!posicion) return res.status(404).json({ message: 'Posición no encontrada.' });
    res.json(posicion);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre, alias } = req.body;
    if (!nombre) return res.status(400).json({ message: 'El nombre es obligatorio.' });
    const posicion = await Posicion.create({ nombre, alias: alias || null });
    res.status(201).json(posicion);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const posicion = await Posicion.findOne({ where: { id: req.params.id } });
    if (!posicion) return res.status(404).json({ message: 'Posición no encontrada.' });
    const { nombre, alias } = req.body;
    if (nombre !== undefined) posicion.nombre = nombre;
    if (alias !== undefined) posicion.alias = alias || null;
    await posicion.save();
    res.json(posicion);
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Posicion.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Posición no encontrada.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
