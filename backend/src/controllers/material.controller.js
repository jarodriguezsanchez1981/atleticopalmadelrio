const { Material } = require('../models');

async function listar(req, res, next) {
  try {
    const materiales = await Material.findAll({ order: [['nombre', 'ASC']] });
    res.json(materiales);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const material = await Material.findOne({ where: { id: req.params.id } });
    if (!material) return res.status(404).json({ message: 'Material no encontrado.' });
    res.json(material);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ message: 'El nombre es obligatorio.' });
    const material = await Material.create({ nombre });
    res.status(201).json(material);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const material = await Material.findOne({ where: { id: req.params.id } });
    if (!material) return res.status(404).json({ message: 'Material no encontrado.' });
    const { nombre } = req.body;
    if (nombre !== undefined) material.nombre = nombre;
    await material.save();
    res.json(material);
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Material.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Material no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
