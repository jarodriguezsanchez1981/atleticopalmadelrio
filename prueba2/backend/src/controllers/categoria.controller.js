const { Categoria } = require('../models');

async function listar(req, res, next) {
  try {
    const { temporada } = req.query;
    const where = temporada ? { temporada } : undefined;
    const categorias = await Categoria.findAll({ where, order: [['temporada', 'DESC'], ['nombre', 'ASC']] });
    res.json(categorias);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const categoria = await Categoria.findByPk(req.params.id);
    if (!categoria) return res.status(404).json({ message: 'Categoría no encontrada.' });
    res.json(categoria);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre, temporada } = req.body;
    if (!nombre || !temporada) return res.status(400).json({ message: 'Nombre y temporada son obligatorios.' });
    const categoria = await Categoria.create({ nombre, temporada });
    res.status(201).json(categoria);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const categoria = await Categoria.findByPk(req.params.id);
    if (!categoria) return res.status(404).json({ message: 'Categoría no encontrada.' });
    const { nombre, temporada } = req.body;
    if (nombre !== undefined) categoria.nombre = nombre;
    if (temporada !== undefined) categoria.temporada = temporada;
    await categoria.save();
    res.json(categoria);
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Categoria.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Categoría no encontrada.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
