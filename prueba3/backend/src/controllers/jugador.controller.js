const { Jugador, Categoria, Temporada, Partido, Equipo, Lugar, Incidencia, PartidoJugador, Entrenamiento, EntrenamientoJugador } = require('../models');
const { validarDNI } = require('../utils/dni.utils');

const includeCategorias = {
  model: Categoria,
  as: 'categorias',
  attributes: ['id', 'nombre', 'id_temporada'],
  through: { attributes: [] }
};

const includeJugador = [
  { model: Temporada, as: 'temporada', attributes: ['id', 'nombre'] },
  includeCategorias
];

const includeDetalle = [
  ...includeJugador,
  {
    model: PartidoJugador,
    as: 'convocatorias',
    include: [{
      model: Partido,
      as: 'partido',
      include: [
        { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
        { model: Lugar, as: 'lugar', attributes: ['id', 'nombre'] },
        { model: Equipo, as: 'equipo', attributes: ['id', 'nombre'] }
      ]
    }]
  },
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

function normalizeCategoriasIds(body) {
  if (Array.isArray(body.ids_categorias)) return body.ids_categorias.map(Number).filter(Boolean);
  if (Array.isArray(body.categorias)) {
    return body.categorias.map((c) => (typeof c === 'object' ? Number(c.id) : Number(c))).filter(Boolean);
  }
  return null;
}

function serializeJugador(jugador) {
  const json = jugador.toJSON ? jugador.toJSON() : jugador;
  json.ids_categorias = (json.categorias || []).map((c) => c.id);
  return json;
}

async function listar(req, res, next) {
  try {
    const { id_temporada } = req.query;
    const where = {};
    if (id_temporada) where.id_temporada = id_temporada;
    const jugadores = await Jugador.findAll({
      where: Object.keys(where).length ? where : undefined,
      include: includeJugador,
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
    const { nombre, apellidos, dni, foto, id_temporada } = req.body;
    const idsCategorias = normalizeCategoriasIds(req.body) || [];
    if (!nombre || !apellidos || !dni || !id_temporada) {
      return res.status(400).json({ message: 'Nombre, apellidos, DNI y temporada son obligatorios.' });
    }
    if (!validarDNI(dni)) {
      return res.status(400).json({ message: 'El DNI introducido no es válido.' });
    }
    const jugador = await Jugador.create({ nombre, apellidos, dni, foto: foto || null, id_temporada });
    if (idsCategorias.length) await jugador.setCategorias(idsCategorias);
    const completo = await Jugador.findOne({ where: { id: jugador.id }, include: includeJugador });
    res.status(201).json(serializeJugador(completo));
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const jugador = await Jugador.findOne({ where: { id: req.params.id } });
    if (!jugador) return res.status(404).json({ message: 'Jugador no encontrado.' });
    const { nombre, apellidos, dni, foto, id_temporada } = req.body;
    const idsCategorias = normalizeCategoriasIds(req.body);
    if (nombre !== undefined) jugador.nombre = nombre;
    if (apellidos !== undefined) jugador.apellidos = apellidos;
    if (dni !== undefined) {
      if (!validarDNI(dni)) {
        return res.status(400).json({ message: 'El DNI introducido no es válido.' });
      }
      jugador.dni = dni;
    }
    if (foto !== undefined) jugador.foto = foto || null;
    if (id_temporada !== undefined) jugador.id_temporada = id_temporada;
    await jugador.save();
    if (idsCategorias) await jugador.setCategorias(idsCategorias);
    const actualizado = await Jugador.findOne({ where: { id: jugador.id }, include: includeJugador });
    res.json(serializeJugador(actualizado));
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