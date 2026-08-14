const { Lugar, TipoFutbol } = require('../models');

const includes = [
  {
    model: TipoFutbol,
    as: 'tiposFutbol',
    attributes: ['id', 'nombre'],
    through: { attributes: [] }
  }
];

function normalizeIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(Number).filter(Boolean))];
}

async function verificarTipos(ids) {
  if (!ids.length) return true;
  const contados = await TipoFutbol.count({ where: { id: ids } });
  return contados === ids.length;
}

function serialize(lugar) {
  const json = lugar.toJSON ? lugar.toJSON() : lugar;
  json.ids_tipos_futbol = (json.tiposFutbol || []).map((t) => t.id);
  return json;
}

async function listar(req, res, next) {
  try {
    const { id_tipofutbol } = req.query;
    const where = id_tipofutbol ? { '$tiposFutbol.id$': id_tipofutbol } : undefined;
    const lugares = await Lugar.findAll({ where, include: includes, order: [['nombre', 'ASC']] });
    res.json(lugares.map(serialize));
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const lugar = await Lugar.findOne({ where: { id: req.params.id }, include: includes });
    if (!lugar) return res.status(404).json({ message: 'Lugar no encontrado.' });
    res.json(serialize(lugar));
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre } = req.body;
    const idsTipos = normalizeIds(req.body.ids_tipos_futbol);
    if (!nombre || !idsTipos.length) {
      return res.status(400).json({ message: 'El nombre y al menos un tipo de fútbol son obligatorios.' });
    }
    const ok = await verificarTipos(idsTipos);
    if (!ok) return res.status(400).json({ message: 'Algún tipo de fútbol indicado no existe.' });
    const lugar = await Lugar.create({ nombre });
    await lugar.setTiposFutbol(idsTipos);
    const creado = await Lugar.findOne({ where: { id: lugar.id }, include: includes });
    res.status(201).json(serialize(creado));
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const lugar = await Lugar.findOne({ where: { id: req.params.id } });
    if (!lugar) return res.status(404).json({ message: 'Lugar no encontrado.' });
    const { nombre } = req.body;
    if (nombre !== undefined) lugar.nombre = nombre;
    await lugar.save();
    if (req.body.ids_tipos_futbol !== undefined) {
      const idsTipos = normalizeIds(req.body.ids_tipos_futbol);
      if (!idsTipos.length) return res.status(400).json({ message: 'Al menos un tipo de fútbol es obligatorio.' });
      const ok = await verificarTipos(idsTipos);
      if (!ok) return res.status(400).json({ message: 'Algún tipo de fútbol indicado no existe.' });
      await lugar.setTiposFutbol(idsTipos);
    }
    const actualizado = await Lugar.findOne({ where: { id: lugar.id }, include: includes });
    res.json(serialize(actualizado));
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Lugar.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Lugar no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };