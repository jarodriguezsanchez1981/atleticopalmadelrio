const { Delegado } = require('../models');
const { validarDNI } = require('../utils/dni.utils');

async function listar(req, res, next) {
  try {
    const delegados = await Delegado.findAll({
      order: [['apellidos', 'ASC']]
    });
    res.json(delegados);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const delegado = await Delegado.findOne({ where: { id: req.params.id } });
    if (!delegado) return res.status(404).json({ message: 'Delegado no encontrado.' });
    res.json(delegado);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre, apellidos, dni, foto, tipo, telefono } = req.body;
    if (!nombre || !apellidos || !dni) {
      return res.status(400).json({ message: 'Nombre, apellidos y DNI son obligatorios.' });
    }
    if (!validarDNI(dni)) {
      return res.status(400).json({ message: 'El DNI introducido no es válido.' });
    }
    const existe = await Delegado.findOne({ where: { dni } });
    if (existe) return res.status(409).json({ message: 'Ya existe un delegado con ese DNI.' });
    const delegado = await Delegado.create({ nombre, apellidos, dni, foto: foto || null, tipo: tipo || 'campo', telefono: telefono || null });
    res.status(201).json(delegado);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const delegado = await Delegado.findOne({ where: { id: req.params.id } });
    if (!delegado) return res.status(404).json({ message: 'Delegado no encontrado.' });
    const { nombre, apellidos, dni, foto, tipo, telefono } = req.body;
    if (nombre !== undefined) delegado.nombre = nombre;
    if (apellidos !== undefined) delegado.apellidos = apellidos;
    if (dni !== undefined && dni !== delegado.dni) {
      if (!validarDNI(dni)) {
        return res.status(400).json({ message: 'El DNI introducido no es válido.' });
      }
      const existe = await Delegado.findOne({ where: { dni, id: { ne: delegado.id } } });
      if (existe) return res.status(409).json({ message: 'Ya existe otro delegado con ese DNI.' });
      delegado.dni = dni;
    }
    if (foto !== undefined) delegado.foto = foto || null;
    if (tipo !== undefined) delegado.tipo = tipo;
    if (telefono !== undefined) delegado.telefono = telefono || null;
    await delegado.save();
    res.json(delegado);
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Delegado.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Delegado no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
