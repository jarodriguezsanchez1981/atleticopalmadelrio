const { Op } = require('sequelize');
const { Entrenamiento, EntrenamientoSemanal, EntrenamientoJugador, Jugador, Categoria, Lugar } = require('../models');

const DURACION_ENTRENAMIENTO_DEFECTO = 60;

const includes = [
  { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'id_temporada', 'id_tipofutbol', 'tiempoentrenamiento'] },
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
    attributes: ['id', 'id_jugador', 'asistencia', 'incidencias'],
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
  json.asistencia_tipo = asistencias.length ? 'parcial' : 'total';
  return json;
}

async function guardarAsistencias(idEntrenamiento, detalle) {
  await EntrenamientoJugador.destroy({ where: { id_entrenamiento: idEntrenamiento } });
  const filas = detalle.map((d) => ({
    id_entrenamiento: idEntrenamiento,
    id_jugador: d.id_jugador,
    asistencia: d.asistencia ? true : false,
    incidencias: d.incidencias || null
  }));
  if (filas.length) await EntrenamientoJugador.bulkCreate(filas);
}

/** Asistencia total: registra a todos los jugadores de la categoría como presentes. */
async function guardarAsistenciaTotal(idEntrenamiento, idCategoria) {
  await EntrenamientoJugador.destroy({ where: { id_entrenamiento: idEntrenamiento } });
  const categoria = await Categoria.findOne({
    where: { id: idCategoria },
    include: [{ model: Jugador, as: 'jugadores', attributes: ['id'] }]
  });
  const jugadores = (categoria?.jugadores || []).map((j) => j.id);
  if (jugadores.length) {
    await EntrenamientoJugador.bulkCreate(jugadores.map((id_jugador) => ({
      id_entrenamiento: idEntrenamiento,
      id_jugador,
      asistencia: true,
      incidencias: null
    })));
  }
}

function normalizarDetalleAsistencias(body) {
  if (Array.isArray(body.asistencias)) {
    return body.asistencias.map((a) => ({
      id_jugador: Number(a.id_jugador),
      asistencia: !!a.asistencia,
      incidencias: a.incidencias || null
    })).filter((a) => Number.isFinite(a.id_jugador));
  }
  const presentes = normalizeIds(body.ids_presentes);
  const ausentes = normalizeIds(body.ids_ausentes);
  if (!presentes.length && !ausentes.length) return null;
  return [
    ...presentes.map((id_jugador) => ({ id_jugador, asistencia: true, incidencias: null })),
    ...ausentes.map((id_jugador) => ({ id_jugador, asistencia: false, incidencias: null }))
  ];
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

function seSolapanEntrenamientos(entrenamiento, inicioNuevo, finNuevo) {
  const inicioEx = new Date(entrenamiento.fecha).getTime();
  const finEx = inicioEx + (entrenamiento.categoria?.tiempoentrenamiento || DURACION_ENTRENAMIENTO_DEFECTO) * 60000;
  return inicioNuevo < finEx && inicioEx < finNuevo;
}

async function existeEntrenamientoMismoHorario(idCategoria, fecha, minutosNuevo, omitirId = null) {
  if (!idCategoria || !fecha) return false;
  const inicio = new Date(fecha);
  if (Number.isNaN(inicio.getTime())) return false;
  const finNuevo = inicio.getTime() + (minutosNuevo || DURACION_ENTRENAMIENTO_DEFECTO) * 60000;
  const margen = DURACION_ENTRENAMIENTO_DEFECTO * 60000;
  const where = {
    id_categoria: idCategoria,
    fecha: { [Op.gte]: new Date(inicio.getTime() - margen), [Op.lte]: new Date(finNuevo) }
  };
  if (omitirId) where.id = { [Op.ne]: omitirId };
  const entrenamientos = await Entrenamiento.findAll({
    where,
    include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'tiempoentrenamiento'] }]
  });
  if (omitirId) return entrenamientos.some((e) => String(e.id) !== String(omitirId) && seSolapanEntrenamientos(e, inicio.getTime(), finNuevo));
  return entrenamientos.some((e) => seSolapanEntrenamientos(e, inicio.getTime(), finNuevo));
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
    const categoria = await Categoria.findOne({ where: { id: id_categoria }, attributes: ['id', 'tiempoentrenamiento'] });
    const minutosEntrenamiento = categoria?.tiempoentrenamiento || DURACION_ENTRENAMIENTO_DEFECTO;
    if (await existeEntrenamientoMismoHorario(id_categoria, fecha, minutosEntrenamiento)) {
      return res.status(409).json({ message: 'Esta categoría ya tiene un entrenamiento a esa hora.' });
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

    const detalle = normalizarDetalleAsistencias(req.body);
    if (req.body.asistencia === 'total') {
      await guardarAsistenciaTotal(entrenamiento.id, id_categoria);
    } else if (detalle) {
      await guardarAsistencias(entrenamiento.id, detalle);
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
    if (id_categoria !== undefined || fecha !== undefined) {
      const catFinal = id_categoria !== undefined ? id_categoria : entrenamiento.id_categoria;
      const fechaFinal = fecha !== undefined ? fecha : entrenamiento.fecha;
      const categoria = await Categoria.findOne({ where: { id: catFinal }, attributes: ['id', 'tiempoentrenamiento'] });
      const minutosEntrenamiento = categoria?.tiempoentrenamiento || DURACION_ENTRENAMIENTO_DEFECTO;
      if (await existeEntrenamientoMismoHorario(catFinal, fechaFinal, minutosEntrenamiento, entrenamiento.id)) {
        return res.status(409).json({ message: 'Esta categoría ya tiene un entrenamiento a esa hora.' });
      }
    }
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

    if (req.body.asistencia !== undefined || req.body.asistencias !== undefined || req.body.ids_presentes !== undefined || req.body.ids_ausentes !== undefined) {
      if (req.body.asistencia === 'total') {
        await guardarAsistenciaTotal(entrenamiento.id, entrenamiento.id_categoria);
      } else {
        const detalle = normalizarDetalleAsistencias(req.body);
        if (detalle) await guardarAsistencias(entrenamiento.id, detalle);
      }
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

async function eliminarSemanal(req, res, next) {
  try {
    const eliminado = await EntrenamientoSemanal.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Entrenamiento no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar, eliminarSemanal };