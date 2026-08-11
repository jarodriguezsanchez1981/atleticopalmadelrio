const { Op } = require('sequelize');
const { Entrenamiento, EntrenamientoSemanal, EntrenamientoJugador, Jugador, Categoria, Lugar } = require('../models');

const includes = [
  { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'id_temporada'] },
  { model: Lugar, as: 'lugar', attributes: ['id', 'nombre'] },
  {
    model: EntrenamientoSemanal,
    as: 'semanales',
    attributes: ['id', 'fecha_entrenamiento', 'incidencias'],
    order: [['fecha_entrenamiento', 'ASC']]
  },
  {
    model: EntrenamientoJugador,
    as: 'asistencias',
    attributes: ['id', 'id_jugador', 'asistencia'],
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

function calcularFechasSemanal(fechaBase, hasta) {
  const fechas = [];
  const base = new Date(fechaBase);
  if (!hasta) {
    fechas.push(new Date(base));
    return fechas;
  }
  const fin = new Date(hasta);
  const aDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  for (let f = new Date(base); aDia(new Date(f)) <= aDia(fin); f = new Date(f.getTime() + 7 * 24 * 60 * 60 * 1000)) {
    fechas.push(new Date(f));
  }
  if (!fechas.length) fechas.push(new Date(base));
  return fechas;
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
    const { id_categoria, fecha, id_lugar, recurrente, incidencias, hasta } = req.body;
    if (!id_categoria || !fecha || !id_lugar) {
      return res.status(400).json({ message: 'Categoría, fecha y lugar son obligatorios.' });
    }
    const esRecurrente = recurrente ? 1 : 0;
    const hastaFecha = recurrente && hasta ? hasta : null;

    const entrenamiento = await Entrenamiento.create({
      id_categoria,
      fecha,
      hasta: hastaFecha,
      id_lugar,
      id_usuario: req.user?.id || null,
      recurrente: esRecurrente
    });

    const fechas = calcularFechasSemanal(fecha, hastaFecha);
    const filas = fechas.map((f) => ({
      id_entrenamiento: entrenamiento.id,
      fecha_entrenamiento: f,
      incidencias: incidencias || null
    }));
    if (filas.length) await EntrenamientoSemanal.bulkCreate(filas);

    const presentes = normalizeIds(req.body.ids_presentes);
    const ausentes = normalizeIds(req.body.ids_ausentes);
    if (presentes.length || ausentes.length) {
      await guardarAsistencias(entrenamiento.id, presentes, ausentes);
    }

    const completo = await Entrenamiento.findByPk(entrenamiento.id, { include: includes });
    res.status(201).json(serialize(completo));
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const entrenamiento = await Entrenamiento.findByPk(req.params.id);
    if (!entrenamiento) return res.status(404).json({ message: 'Entrenamiento no encontrado.' });
    const { id_categoria, fecha, id_lugar, recurrente, hasta } = req.body;
    if (id_categoria !== undefined) entrenamiento.id_categoria = id_categoria;
    if (fecha !== undefined) entrenamiento.fecha = fecha;
    if (id_lugar !== undefined) entrenamiento.id_lugar = id_lugar;
    if (recurrente !== undefined) entrenamiento.recurrente = recurrente ? 1 : 0;
    if (recurrente !== undefined || fecha !== undefined || hasta !== undefined) {
      entrenamiento.hasta = recurrente && hasta ? hasta : null;
    }
    await entrenamiento.save();

    if (recurrente !== undefined || fecha !== undefined || hasta !== undefined) {
      await EntrenamientoSemanal.destroy({ where: { id_entrenamiento: entrenamiento.id } });
      const fechas = calcularFechasSemanal(entrenamiento.fecha, entrenamiento.hasta);
      const filas = fechas.map((f) => ({
        id_entrenamiento: entrenamiento.id,
        fecha_entrenamiento: f,
        incidencias: null
      }));
      if (filas.length) await EntrenamientoSemanal.bulkCreate(filas);
    }

    if (req.body.ids_presentes !== undefined || req.body.ids_ausentes !== undefined) {
      await guardarAsistencias(entrenamiento.id, normalizeIds(req.body.ids_presentes), normalizeIds(req.body.ids_ausentes));
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