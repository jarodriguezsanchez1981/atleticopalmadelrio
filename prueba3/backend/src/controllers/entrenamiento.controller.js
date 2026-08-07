const { Op } = require('sequelize');
const { Entrenamiento, Categoria, Lugar, EntrenamientoJugador, Jugador } = require('../models');

const includes = [
  { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'id_temporada'] },
  { model: Lugar, as: 'lugar', attributes: ['id', 'nombre'] },
  {
    model: EntrenamientoJugador,
    as: 'asistencias',
    attributes: ['id', 'asistencia', 'incidencias'],
    include: [{ model: Jugador, as: 'jugador', attributes: ['id', 'nombre', 'apellidos'] }]
  }
];

function normalizeIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(Number).filter(Boolean))];
}

function serialize(entrenamiento) {
  const json = entrenamiento.toJSON ? entrenamiento.toJSON() : entrenamiento;
  const asistencias = json.asistencias || [];
  json.ids_presentes = asistencias.filter((a) => a.asistencia).map((a) => a.id_jugador);
  json.ids_ausentes = asistencias.filter((a) => !a.asistencia).map((a) => a.id_jugador);
  return json;
}

async function guardarAsistencias(idEntrenamiento, presentes, ausentes) {
  await EntrenamientoJugador.destroy({ where: { id_entrenamiento: idEntrenamiento } });
  const filas = [
    ...presentes.map((id_jugador) => ({ id_entrenamiento: idEntrenamiento, id_jugador, asistencia: true, incidencias: null })),
    ...ausentes.map((id_jugador) => ({ id_entrenamiento: idEntrenamiento, id_jugador, asistencia: false, incidencias: null }))
  ];
  if (filas.length) await EntrenamientoJugador.bulkCreate(filas);
}

async function listar(req, res, next) {
  try {
    const { id_categoria, id_lugar, desde, hasta } = req.query;
    const where = {};
    if (id_categoria) where.id_categoria = id_categoria;
    if (id_lugar) where.id_lugar = id_lugar;
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha[Op.gte] = new Date(desde);
      if (hasta) where.fecha[Op.lte] = new Date(hasta);
    }
    const entrenamientos = await Entrenamiento.findAll({
      where,
      include: includes,
      order: [['fecha', 'ASC']]
    });
    res.json(entrenamientos.map(serialize));
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const entrenamiento = await Entrenamiento.findByPk(req.params.id, { include: includes });
    if (!entrenamiento) return res.status(404).json({ message: 'Entrenamiento no encontrado.' });
    res.json(serialize(entrenamiento));
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { id_categoria, fecha, id_lugar, recurrente, incidencias } = req.body;
    if (!id_categoria || !fecha || !id_lugar) {
      return res.status(400).json({ message: 'Categoría, fecha y lugar son obligatorios.' });
    }
    const entrenamiento = await Entrenamiento.create({
      id_categoria, fecha, id_lugar,
      id_usuario: req.user?.id || null,
      recurrente: recurrente ? 1 : 0,
      incidencias
    });
    const presentes = normalizeIds(req.body.ids_presentes);
    const ausentes = normalizeIds(req.body.ids_ausentes);
    await guardarAsistencias(entrenamiento.id, presentes, ausentes);
    const creado = await Entrenamiento.findByPk(entrenamiento.id, { include: includes });
    res.status(201).json(serialize(creado));
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const entrenamiento = await Entrenamiento.findByPk(req.params.id);
    if (!entrenamiento) return res.status(404).json({ message: 'Entrenamiento no encontrado.' });
    const { id_categoria, fecha, id_lugar, recurrente, incidencias } = req.body;
    if (id_categoria !== undefined) entrenamiento.id_categoria = id_categoria;
    if (fecha !== undefined) entrenamiento.fecha = fecha;
    if (id_lugar !== undefined) entrenamiento.id_lugar = id_lugar;
    if (recurrente !== undefined) entrenamiento.recurrente = recurrente ? 1 : 0;
    if (incidencias !== undefined) entrenamiento.incidencias = incidencias;
    await entrenamiento.save();
    if (req.body.ids_presentes !== undefined || req.body.ids_ausentes !== undefined) {
      const presentes = normalizeIds(req.body.ids_presentes);
      const ausentes = normalizeIds(req.body.ids_ausentes);
      await guardarAsistencias(entrenamiento.id, presentes, ausentes);
    }
    const actualizado = await Entrenamiento.findByPk(entrenamiento.id, { include: includes });
    res.json(serialize(actualizado));
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Entrenamiento.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Entrenamiento no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };