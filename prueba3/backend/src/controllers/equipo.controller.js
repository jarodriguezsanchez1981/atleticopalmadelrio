const { Equipo } = require('../models');

async function listar(req, res, next) {
  try {
    const equipos = await Equipo.findAll({ order: [['nombre', 'ASC']] });
    res.json(equipos);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const equipo = await Equipo.findOne({ where: { id: req.params.id } });
    if (!equipo) return res.status(404).json({ message: 'Equipo no encontrado.' });
    res.json(equipo);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ message: 'El nombre es obligatorio.' });
    const equipo = await Equipo.create({ nombre });
    res.status(201).json(equipo);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const equipo = await Equipo.findOne({ where: { id: req.params.id } });
    if (!equipo) return res.status(404).json({ message: 'Equipo no encontrado.' });
    const { nombre } = req.body;
    if (nombre !== undefined) equipo.nombre = nombre;
    await equipo.save();
    res.json(equipo);
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Equipo.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Equipo no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
