const { Titulo } = require('../models');

async function listar(req, res, next) {
  try {
    const titulos = await Titulo.findAll({ order: [['nombre', 'ASC']] });
    res.json(titulos);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const titulo = await Titulo.findOne({ where: { id: req.params.id } });
    if (!titulo) return res.status(404).json({ message: 'Título no encontrado.' });
    res.json(titulo);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ message: 'El nombre es obligatorio.' });
    const titulo = await Titulo.create({ nombre });
    res.status(201).json(titulo);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const titulo = await Titulo.findOne({ where: { id: req.params.id } });
    if (!titulo) return res.status(404).json({ message: 'Título no encontrado.' });
    const { nombre } = req.body;
    if (nombre !== undefined) titulo.nombre = nombre;
    await titulo.save();
    res.json(titulo);
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Titulo.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Título no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };