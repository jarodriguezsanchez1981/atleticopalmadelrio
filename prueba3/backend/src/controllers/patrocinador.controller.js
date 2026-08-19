const { Patrocinador } = require('../models');

function esOrdenValido(orden) {
  return Number.isInteger(Number(orden)) && Number(orden) >= 1 && Number(orden) <= 50;
}

const TIPOS_VALIDOS = ['principal', 'oficial', 'colaborador'];

function esTipoValido(tipo) {
  return TIPOS_VALIDOS.includes(tipo);
}

async function listar(req, res, next) {
  try {
    const patrocinadores = await Patrocinador.findAll({ order: [['orden', 'ASC']] });
    res.json(patrocinadores);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const patrocinador = await Patrocinador.findOne({ where: { id: req.params.id } });
    if (!patrocinador) return res.status(404).json({ message: 'Patrocinador no encontrado.' });
    res.json(patrocinador);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre, imagen, orden, tipo } = req.body;
    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ message: 'El nombre es obligatorio.' });
    }
    if (!esOrdenValido(orden)) {
      return res.status(400).json({ message: 'El orden debe ser un número entre 1 y 50.' });
    }
    if (!tipo || !esTipoValido(String(tipo))) {
      return res.status(400).json({ message: 'El tipo debe ser principal, oficial o colaborador.' });
    }
    const existente = await Patrocinador.findOne({ where: { orden: Number(orden) } });
    if (existente) {
      return res.status(400).json({ message: 'Ese orden ya está en uso por otro patrocinador.' });
    }
    const patrocinador = await Patrocinador.create({
      nombre: String(nombre).trim(),
      imagen: imagen || null,
      orden: Number(orden),
      tipo: String(tipo)
    });
    res.status(201).json(patrocinador);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const patrocinador = await Patrocinador.findOne({ where: { id: req.params.id } });
    if (!patrocinador) return res.status(404).json({ message: 'Patrocinador no encontrado.' });
    const { nombre, imagen, orden, tipo } = req.body;
    if (nombre !== undefined) {
      if (!String(nombre).trim()) return res.status(400).json({ message: 'El nombre es obligatorio.' });
      patrocinador.nombre = String(nombre).trim();
    }
    if (imagen !== undefined) patrocinador.imagen = imagen;
    if (tipo !== undefined) {
      if (!esTipoValido(String(tipo))) {
        return res.status(400).json({ message: 'El tipo debe ser principal, oficial o colaborador.' });
      }
      patrocinador.tipo = String(tipo);
    }
    if (orden !== undefined) {
      if (!esOrdenValido(orden)) {
        return res.status(400).json({ message: 'El orden debe ser un número entre 1 y 50.' });
      }
      const nuevoOrden = Number(orden);
      if (nuevoOrden !== patrocinador.orden) {
        const existente = await Patrocinador.findOne({ where: { orden: nuevoOrden } });
        if (existente) {
          return res.status(400).json({ message: 'Ese orden ya está en uso por otro patrocinador.' });
        }
        patrocinador.orden = nuevoOrden;
      }
    }
    await patrocinador.save();
    res.json(patrocinador);
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Patrocinador.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Patrocinador no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };