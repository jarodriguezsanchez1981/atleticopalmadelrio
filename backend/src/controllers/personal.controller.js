const { Personal } = require('../models');
const { esUrlImagen } = require('../utils/imagenes');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Campos de texto opcionales: vacío -> null. */
const opcional = (v) => (v === undefined ? undefined : (String(v ?? '').trim() || null));

function validar({ nombre, apellidos, email }, parcial = false) {
  if (!parcial || nombre !== undefined) {
    if (!String(nombre ?? '').trim()) return 'El nombre es obligatorio.';
  }
  if (!parcial || apellidos !== undefined) {
    if (!String(apellidos ?? '').trim()) return 'Los apellidos son obligatorios.';
  }
  if (email && !EMAIL.test(String(email).trim())) return 'El email no es válido.';
  return null;
}

async function listar(req, res, next) {
  try {
    const personal = await Personal.findAll({ order: [['apellidos', 'ASC'], ['nombre', 'ASC']] });
    res.json(personal);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const persona = await Personal.findOne({ where: { id: req.params.id } });
    if (!persona) return res.status(404).json({ message: 'Persona no encontrada.' });
    res.json(persona);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre, apellidos, email, telefono, seccion, foto } = req.body;
    const error = validar(req.body);
    if (error) return res.status(400).json({ message: error });
    const persona = await Personal.create({
      nombre: String(nombre).trim(),
      apellidos: String(apellidos).trim(),
      email: opcional(email) ?? null,
      telefono: opcional(telefono) ?? null,
      seccion: opcional(seccion) ?? null,
      foto: esUrlImagen(foto) ? null : (foto || null)
    });
    res.status(201).json(persona);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const persona = await Personal.findOne({ where: { id: req.params.id } });
    if (!persona) return res.status(404).json({ message: 'Persona no encontrada.' });
    const error = validar(req.body, true);
    if (error) return res.status(400).json({ message: error });
    const { nombre, apellidos, email, telefono, seccion, foto } = req.body;
    if (nombre !== undefined) persona.nombre = String(nombre).trim();
    if (apellidos !== undefined) persona.apellidos = String(apellidos).trim();
    if (email !== undefined) persona.email = opcional(email);
    if (telefono !== undefined) persona.telefono = opcional(telefono);
    if (seccion !== undefined) persona.seccion = opcional(seccion);
    // La URL de /api/imagenes es la foto que ya tenía: no se toca.
    if (foto !== undefined && !esUrlImagen(foto)) persona.foto = foto || null;
    await persona.save();
    res.json(persona);
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Personal.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Persona no encontrada.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
