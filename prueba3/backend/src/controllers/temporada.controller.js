const { Temporada } = require('../models');

async function listar(req, res, next) {
  try {
    const temporadas = await Temporada.findAll({ order: [['nombre', 'DESC']] });
    res.json(temporadas);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const temporada = await Temporada.findByPk(req.params.id);
    if (!temporada) return res.status(404).json({ message: 'Temporada no encontrada.' });
    res.json(temporada);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ message: 'El nombre es obligatorio.' });
    const temporada = await Temporada.create({ nombre });
    res.status(201).json(temporada);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const temporada = await Temporada.findByPk(req.params.id);
    if (!temporada) return res.status(404).json({ message: 'Temporada no encontrada.' });
    const { nombre } = req.body;
    if (nombre !== undefined) temporada.nombre = nombre;
    await temporada.save();
    res.json(temporada);
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Temporada.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Temporada no encontrada.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
