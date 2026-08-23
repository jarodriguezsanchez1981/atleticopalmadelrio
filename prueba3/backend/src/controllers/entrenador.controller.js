const { Entrenador, Titulo } = require('../models');
const { validarDNI } = require('../utils/dni.utils');

const includeTitulos = {
  model: Titulo,
  as: 'titulos',
  attributes: ['id', 'nombre'],
  through: { attributes: [] }
};

const includeEntrenador = [includeTitulos];

function normalizeTitulosIds(body) {
  if (Array.isArray(body.ids_titulos)) return body.ids_titulos.map(Number).filter(Boolean);
  if (Array.isArray(body.titulos)) {
    return body.titulos.map((t) => (typeof t === 'object' ? Number(t.id) : Number(t))).filter(Boolean);
  }
  return null;
}

function serializeEntrenador(entrenador) {
  const json = entrenador.toJSON ? entrenador.toJSON() : entrenador;
  json.ids_titulos = (json.titulos || []).map((t) => t.id);
  return json;
}

async function listar(req, res, next) {
  try {
    const entrenadores = await Entrenador.findAll({
      include: includeEntrenador,
      order: [['apellidos', 'ASC']]
    });
    res.json(entrenadores.map(serializeEntrenador));
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const entrenador = await Entrenador.findOne({ where: { id: req.params.id }, include: includeEntrenador });
    if (!entrenador) return res.status(404).json({ message: 'Entrenador no encontrado.' });
    res.json(serializeEntrenador(entrenador));
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre, apellidos, dni, foto } = req.body;
    const idsTitulos = normalizeTitulosIds(req.body) || [];
    if (!nombre || !apellidos || !dni) {
      return res.status(400).json({ message: 'Nombre, apellidos y DNI son obligatorios.' });
    }
    if (!validarDNI(dni)) {
      return res.status(400).json({ message: 'El DNI introducido no es válido.' });
    }
    const existe = await Entrenador.findOne({ where: { dni } });
    if (existe) return res.status(409).json({ message: 'Ya existe un entrenador con ese DNI.' });
    const entrenador = await Entrenador.create({
      nombre, apellidos, dni, foto: foto || null
    });
    if (idsTitulos.length) await entrenador.setTitulos(idsTitulos);
    const completo = await Entrenador.findOne({ where: { id: entrenador.id }, include: includeEntrenador });
    res.status(201).json(serializeEntrenador(completo));
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const entrenador = await Entrenador.findOne({ where: { id: req.params.id } });
    if (!entrenador) return res.status(404).json({ message: 'Entrenador no encontrado.' });
    const { nombre, apellidos, dni, foto } = req.body;
    const idsTitulos = normalizeTitulosIds(req.body);
    if (nombre !== undefined) entrenador.nombre = nombre;
    if (apellidos !== undefined) entrenador.apellidos = apellidos;
    if (dni !== undefined && dni !== entrenador.dni) {
      if (!validarDNI(dni)) {
        return res.status(400).json({ message: 'El DNI introducido no es válido.' });
      }
      const existe = await Entrenador.findOne({ where: { dni, id: { ne: entrenador.id } } });
      if (existe) return res.status(409).json({ message: 'Ya existe otro entrenador con ese DNI.' });
      entrenador.dni = dni;
    }
    if (foto !== undefined) entrenador.foto = foto || null;
    await entrenador.save();
    if (idsTitulos) await entrenador.setTitulos(idsTitulos);
    const actualizado = await Entrenador.findOne({ where: { id: entrenador.id }, include: includeEntrenador });
    res.json(serializeEntrenador(actualizado));
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const borrados = await Entrenador.destroy({ where: { id: req.params.id } });
    if (!borrados) return res.status(404).json({ message: 'Entrenador no encontrado.' });
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
