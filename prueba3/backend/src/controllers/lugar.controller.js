const { Lugar } = require('../models');

async function listar(req, res, next) {
  try {
    const lugares = await Lugar.findAll({ order: [['nombre', 'ASC']] });
    res.json(lugares);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const lugar = await Lugar.findOne({ where: { id: req.params.id } });
    if (!lugar) return res.status(404).json({ message: 'Lugar no encontrado.' });
    res.json(lugar);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ message: 'El nombre es obligatorio.' });
    const lugar = await Lugar.create({ nombre });
    res.status(201).json(lugar);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const lugar = await Lugar.findOne({ where: { id: req.params.id } });
    if (!lugar) return res.status(404).json({ message: 'Lugar no encontrado.' });
    const { nombre } = req.body;
    if (nombre !== undefined) lugar.nombre = nombre;
    await lugar.save();
    res.json(lugar);
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Lugar.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Lugar no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
