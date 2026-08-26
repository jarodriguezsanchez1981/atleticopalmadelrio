const { Jugador, Categoria, Lugar, Entrenamiento, EntrenamientoJugador } = require('../models');
const { validarDNI } = require('../utils/dni.utils');

const includeDetalle = [
  {
    model: EntrenamientoJugador,
    as: 'asistencias',
    include: [{
      model: Entrenamiento,
      as: 'entrenamiento',
      include: [
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
        { model: Lugar, as: 'lugar', attributes: ['id', 'nombre'] }
      ]
    }]
  }
];

function serializeJugador(jugador) {
  return jugador.toJSON ? jugador.toJSON() : jugador;
}

async function listar(req, res, next) {
  try {
    const jugadores = await Jugador.findAll({
      order: [['apellidos', 'ASC']]
    });
    res.json(jugadores.map(serializeJugador));
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const jugador = await Jugador.findOne({ where: { id: req.params.id }, include: includeDetalle });
    if (!jugador) return res.status(404).json({ message: 'Jugador no encontrado.' });
    res.json(serializeJugador(jugador));
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre, apellidos, dni, fecha_nacimiento, foto, telefono } = req.body;
    if (!nombre || !apellidos || !dni) {
      return res.status(400).json({ message: 'Nombre, apellidos y DNI son obligatorios.' });
    }
    if (!validarDNI(dni)) {
      return res.status(400).json({ message: 'El DNI introducido no es válido.' });
    }
    const existe = await Jugador.findOne({ where: { dni } });
    if (existe) return res.status(409).json({ message: 'Ya existe un jugador con ese DNI.' });
    const jugador = await Jugador.create({
      nombre,
      apellidos,
      dni,
      fecha_nacimiento: fecha_nacimiento || null,
      foto: foto || null,
      telefono: telefono || null
    });
    res.status(201).json(serializeJugador(jugador));
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const jugador = await Jugador.findOne({ where: { id: req.params.id } });
    if (!jugador) return res.status(404).json({ message: 'Jugador no encontrado.' });
    const { nombre, apellidos, dni, fecha_nacimiento, foto, telefono } = req.body;
    if (nombre !== undefined) jugador.nombre = nombre;
    if (apellidos !== undefined) jugador.apellidos = apellidos;
    if (dni !== undefined && dni !== jugador.dni) {
      if (!validarDNI(dni)) {
        return res.status(400).json({ message: 'El DNI introducido no es válido.' });
      }
      const existe = await Jugador.findOne({ where: { dni, id: { ne: jugador.id } } });
      if (existe) return res.status(409).json({ message: 'Ya existe otro jugador con ese DNI.' });
      jugador.dni = dni;
    }
    if (fecha_nacimiento !== undefined) jugador.fecha_nacimiento = fecha_nacimiento || null;
    if (foto !== undefined) jugador.foto = foto || null;
    if (telefono !== undefined) jugador.telefono = telefono || null;
    await jugador.save();
    res.json(serializeJugador(jugador));
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Jugador.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Jugador no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
