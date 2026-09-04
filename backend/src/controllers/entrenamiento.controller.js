const { Op } = require('sequelize');
const { Entrenamiento, Partido, Torneo, Plantilla, Categoria, Lugar } = require('../models');
const { categoriaDelUsuario, includesConCategoria } = require('../utils/filtroCategoria');
const { otroTipoDeEventoMismoDia } = require('../utils/calendarioConflictos');

const includes = [
  { model: Plantilla, as: 'plantilla', attributes: ['id', 'id_categoria', 'id_temporada'], include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'alias', 'id_tipofutbol', 'tiempopartido', 'tiempoentrenamiento'] }] },
  { model: Lugar, as: 'lugar', attributes: ['id', 'nombre'] }
];

function serialize(entrenamiento) {
  const json = entrenamiento.toJSON ? entrenamiento.toJSON() : entrenamiento;
  return json;
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
    const { id_plantilla, id_lugar, desde, hasta } = req.query;
    const where = {};
    if (id_plantilla) where.id_plantilla = id_plantilla;
    if (id_lugar) where.id_lugar = id_lugar;
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha[Op.gte] = new Date(desde);
      if (hasta) where.fecha[Op.lte] = new Date(hasta);
    }
    const entrenamientos = await Entrenamiento.findAll({
      where,
      include: includesConCategoria(includes, categoriaDelUsuario(req)),
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
    const { id_plantilla, fecha, id_lugar, recurrente, incidencias, hasta } = req.body;
    if (!id_plantilla || !fecha || !id_lugar) {
      return res.status(400).json({ message: 'Plantilla, fecha y lugar son obligatorios.' });
    }
    const conflicto = await otroTipoDeEventoMismoDia({
      models: { Entrenamiento, Partido, Torneo }, idPlantilla: id_plantilla, fecha, tipoActual: null
    });
    if (conflicto) {
      return res.status(409).json({ message: `Esta plantilla ya tiene un ${conflicto} ese día.` });
    }
    const esRecurrente = recurrente ? 1 : 0;
    const hastaFecha = recurrente && hasta ? hasta : null;

    const entrenamiento = await Entrenamiento.create({
      id_plantilla,
      fecha,
      hasta: hastaFecha,
      id_lugar,
      id_usuario: req.user?.id || null,
      recurrente: esRecurrente
    });

    const completo = await Entrenamiento.findByPk(entrenamiento.id, { include: includes });
    res.status(201).json(serialize(completo));
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const entrenamiento = await Entrenamiento.findByPk(req.params.id);
    if (!entrenamiento) return res.status(404).json({ message: 'Entrenamiento no encontrado.' });
    const { id_plantilla, fecha, id_lugar, recurrente, hasta } = req.body;
    if (id_plantilla !== undefined || fecha !== undefined) {
      const plantillaFinal = id_plantilla !== undefined ? id_plantilla : entrenamiento.id_plantilla;
      const fechaFinal = fecha !== undefined ? fecha : entrenamiento.fecha;
      const conflicto = await otroTipoDeEventoMismoDia({
        models: { Entrenamiento, Partido, Torneo }, idPlantilla: plantillaFinal, fecha: fechaFinal,
        tipoActual: null, excluirEntrenamientoId: entrenamiento.id
      });
      if (conflicto) {
        return res.status(409).json({ message: `Esta plantilla ya tiene un ${conflicto} ese día.` });
      }
    }
    if (id_plantilla !== undefined) entrenamiento.id_plantilla = id_plantilla;
    if (fecha !== undefined) entrenamiento.fecha = fecha;
    if (id_lugar !== undefined) entrenamiento.id_lugar = id_lugar;
    if (recurrente !== undefined) entrenamiento.recurrente = recurrente ? 1 : 0;
    if (recurrente !== undefined || fecha !== undefined || hasta !== undefined) {
      entrenamiento.hasta = recurrente && hasta ? hasta : null;
    }
    await entrenamiento.save();

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
