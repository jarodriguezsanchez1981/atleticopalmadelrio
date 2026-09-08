const { Coordinador } = require('../models');

async function listar(req, res, next) {
  try {
    const coordinadores = await Coordinador.findAll({ order: [['apellidos', 'ASC']] });
    res.json(coordinadores);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const coordinador = await Coordinador.findOne({ where: { id: req.params.id } });
    if (!coordinador) return res.status(404).json({ message: 'Coordinador no encontrado.' });
    res.json(coordinador);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre, apellidos, email, telefono } = req.body;
    if (!nombre || !apellidos) {
      return res.status(400).json({ message: 'Nombre y apellidos son obligatorios.' });
    }
    const coordinador = await Coordinador.create({
      nombre, apellidos, email: email || null, telefono: telefono || null
    });
    res.status(201).json(coordinador);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const coordinador = await Coordinador.findOne({ where: { id: req.params.id } });
    if (!coordinador) return res.status(404).json({ message: 'Coordinador no encontrado.' });
    const { nombre, apellidos, email, telefono } = req.body;
    if (nombre !== undefined) coordinador.nombre = nombre;
    if (apellidos !== undefined) coordinador.apellidos = apellidos;
    if (email !== undefined) coordinador.email = email || null;
    if (telefono !== undefined) coordinador.telefono = telefono || null;
    await coordinador.save();
    res.json(coordinador);
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Coordinador.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Coordinador no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
