const { Categoria, TipoFutbol } = require('../models');

const includes = [
  {
    model: TipoFutbol,
    as: 'tipofutbol',
    attributes: ['id', 'nombre']
  }
];

function serializeCategoria(categoria) {
  return categoria.toJSON ? categoria.toJSON() : categoria;
}

async function listar(req, res, next) {
  try {
    const categorias = await Categoria.findAll({
      include: includes,
      order: [['nombre', 'ASC']]
    });
    res.json(categorias.map(serializeCategoria));
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const categoria = await Categoria.findOne({ where: { id: req.params.id }, include: includes });
    if (!categoria) return res.status(404).json({ message: 'Categoría no encontrada.' });
    res.json(serializeCategoria(categoria));
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre, alias, id_tipofutbol, tiempopartido, tiempoentrenamiento } = req.body;
    if (!nombre || !id_tipofutbol) {
      return res.status(400).json({ message: 'Nombre y tipo de fútbol son obligatorios.' });
    }
    const tipoFutbol = await TipoFutbol.findOne({ where: { id: id_tipofutbol } });
    if (!tipoFutbol) return res.status(400).json({ message: 'El tipo de fútbol indicado no existe.' });
    if (tiempopartido !== undefined && tiempopartido !== null && (!Number.isInteger(tiempopartido) || tiempopartido <= 0)) {
      return res.status(400).json({ message: 'El tiempo de partido debe ser un número de minutos positivo.' });
    }
    if (tiempoentrenamiento !== undefined && tiempoentrenamiento !== null && (!Number.isInteger(tiempoentrenamiento) || tiempoentrenamiento <= 0)) {
      return res.status(400).json({ message: 'El tiempo de entrenamiento debe ser un número de minutos positivo.' });
    }
    const categoria = await Categoria.create({
      nombre,
      alias: alias || null,
      id_tipofutbol,
      tiempopartido: tiempopartido || null,
      tiempoentrenamiento: tiempoentrenamiento || null
    });
    const creada = await Categoria.findOne({ where: { id: categoria.id }, include: includes });
    res.status(201).json(serializeCategoria(creada));
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const categoria = await Categoria.findOne({ where: { id: req.params.id } });
    if (!categoria) return res.status(404).json({ message: 'Categoría no encontrada.' });
    const { nombre, alias, id_tipofutbol, tiempopartido, tiempoentrenamiento } = req.body;
    if (nombre !== undefined) categoria.nombre = nombre;
    if (alias !== undefined) categoria.alias = alias || null;
    if (id_tipofutbol !== undefined) {
      const tipoFutbol = await TipoFutbol.findOne({ where: { id: id_tipofutbol } });
      if (!tipoFutbol) return res.status(400).json({ message: 'El tipo de fútbol indicado no existe.' });
      categoria.id_tipofutbol = id_tipofutbol;
    }
    if (tiempopartido !== undefined) {
      if (tiempopartido !== null && (!Number.isInteger(tiempopartido) || tiempopartido <= 0)) {
        return res.status(400).json({ message: 'El tiempo de partido debe ser un número de minutos positivo.' });
      }
      categoria.tiempopartido = tiempopartido || null;
    }
    if (tiempoentrenamiento !== undefined) {
      if (tiempoentrenamiento !== null && (!Number.isInteger(tiempoentrenamiento) || tiempoentrenamiento <= 0)) {
        return res.status(400).json({ message: 'El tiempo de entrenamiento debe ser un número de minutos positivo.' });
      }
      categoria.tiempoentrenamiento = tiempoentrenamiento || null;
    }
    await categoria.save();
    const actualizada = await Categoria.findOne({ where: { id: categoria.id }, include: includes });
    res.json(serializeCategoria(actualizada));
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
