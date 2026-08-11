const { EntrenamientoJugador, Entrenamiento, Jugador, Categoria, Lugar } = require('../models');

const includes = [
  {
    model: Entrenamiento,
    as: 'entrenamiento',
    attributes: ['id', 'fecha', 'id_categoria', 'id_lugar'],
    include: [
      { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
      { model: Lugar, as: 'lugar', attributes: ['id', 'nombre'] }
    ]
  },
  {
    model: Jugador,
    as: 'jugador',
    attributes: ['id', 'nombre', 'apellidos']
  }
];

function normalizeAsistencia(value) {
  if (value === undefined || value === null || value === '') return true;
  return value === true || value === 'true' || value === 1 || value === '1';
}

function normalizeNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

async function listar(req, res, next) {
  try {
    const { id_entrenamiento, id_jugador } = req.query;
    const where = {};
    if (id_entrenamiento) where.id_entrenamiento = id_entrenamiento;
    if (id_jugador) where.id_jugador = id_jugador;
    const registros = await EntrenamientoJugador.findAll({
      where: Object.keys(where).length ? where : undefined,
      include: includes,
      order: [['id', 'ASC']]
    });
    res.json(registros);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const registro = await EntrenamientoJugador.findByPk(req.params.id, { include: includes });
    if (!registro) return res.status(404).json({ message: 'Registro no encontrado.' });
    res.json(registro);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { id_entrenamiento, id_jugador } = req.body;
    if (!id_entrenamiento || !id_jugador) {
      return res.status(400).json({ message: 'El entrenamiento y el jugador son obligatorios.' });
    }
    const creado = await EntrenamientoJugador.create({
      id_entrenamiento,
      id_jugador,
      asistencia: normalizeAsistencia(req.body.asistencia),
      incidencias: req.body.incidencias || null
    });
    const completo = await EntrenamientoJugador.findByPk(creado.id, { include: includes });
    res.status(201).json(completo);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const registro = await EntrenamientoJugador.findByPk(req.params.id);
    if (!registro) return res.status(404).json({ message: 'Registro no encontrado.' });
    const { id_entrenamiento, id_jugador, incidencias } = req.body;
    if (id_entrenamiento !== undefined) registro.id_entrenamiento = id_entrenamiento;
    if (id_jugador !== undefined) registro.id_jugador = id_jugador;
    if (req.body.asistencia !== undefined) registro.asistencia = normalizeAsistencia(req.body.asistencia);
    if (incidencias !== undefined) registro.incidencias = incidencias || null;
    await registro.save();
    const actualizado = await EntrenamientoJugador.findByPk(registro.id, { include: includes });
    res.json(actualizado);
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await EntrenamientoJugador.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Registro no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };