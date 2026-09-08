const { Op } = require('sequelize');
const { Temporada } = require('../models');

async function listar(req, res, next) {
  try {
    const temporadas = await Temporada.findAll({ order: [['nombre', 'DESC']] });
    res.json(temporadas);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const temporada = await Temporada.findOne({ where: { id: req.params.id } });
    if (!temporada) return res.status(404).json({ message: 'Temporada no encontrada.' });
    res.json(temporada);
  } catch (err) { next(err); }
}

/** Solo puede haber una temporada marcada como actual: desmarca las demás. */
async function marcarComoUnicaActual(idExcluido) {
  const where = idExcluido ? { id: { [Op.ne]: idExcluido } } : {};
  await Temporada.update({ actual: false }, { where });
}

async function crear(req, res, next) {
  try {
    const { nombre, actual } = req.body;
    if (!nombre) return res.status(400).json({ message: 'El nombre es obligatorio.' });
    const temporada = await Temporada.create({ nombre, actual: !!actual });
    if (actual) await marcarComoUnicaActual(temporada.id);
    res.status(201).json(temporada);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const temporada = await Temporada.findOne({ where: { id: req.params.id } });
    if (!temporada) return res.status(404).json({ message: 'Temporada no encontrada.' });
    const { nombre, actual } = req.body;
    if (nombre !== undefined) temporada.nombre = nombre;
    if (actual !== undefined) temporada.actual = !!actual;
    await temporada.save();
    if (temporada.actual) await marcarComoUnicaActual(temporada.id);
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
