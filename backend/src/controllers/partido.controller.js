const { Op } = require('sequelize');
const { Partido, Plantilla, Categoria, Lugar, Equipo, Resultado } = require('../models');
const { categoriaDelUsuario, includesConCategoria } = require('../utils/filtroCategoria');

const DURACION_PARTIDO_DEFECTO = 90;
const PALMA_ID = 73;

/** Guarda (upsert) las incidencias del resultado en la tabla resultados. */
async function guardarResultadoIncidencias(idPartido, incidencias) {
  await Resultado.destroy({ where: { id_partido: idPartido } });
  if (incidencias == null || incidencias === '') return;
  await Resultado.create({ id_partido: idPartido, resultado: '', incidencias: incidencias || null });
}

const includesBase = [
  {
    model: Plantilla,
    as: 'plantilla',
    attributes: ['id', 'id_categoria', 'id_temporada'],
    include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'alias', 'id_tipofutbol', 'tiempopartido', 'tiempoentrenamiento'] }]
  },
  { model: Lugar, as: 'lugar', attributes: ['id', 'nombre'] },
  { model: Equipo, as: 'equipoLocal', attributes: ['id', 'nombre', 'escudo', 'direccion', 'localidad', 'provincia'] },
  { model: Equipo, as: 'equipoVisitante', attributes: ['id', 'nombre', 'escudo', 'direccion', 'localidad', 'provincia'] },
  { model: Resultado, as: 'Resultados', attributes: ['id', 'resultado', 'incidencias'] }
];

function serialize(partido) {
  const json = partido.toJSON ? partido.toJSON() : partido;
  const res = Array.isArray(json.Resultados) ? json.Resultados[0] : null;
  if (res) {
    json.resultado_incidencias = res.incidencias;
  }
  return json;
}

async function listar(req, res, next) {
  try {
    const { id_plantilla, id_lugar, id_equipo_local, id_equipo_visitante, desde, hasta } = req.query;
    const where = {};
    if (id_plantilla) where.id_plantilla = id_plantilla;
    if (id_lugar) where.id_lugar = id_lugar;
    if (id_equipo_local) where.id_equipo_local = id_equipo_local;
    if (id_equipo_visitante) where.id_equipo_visitante = id_equipo_visitante;
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha[Op.gte] = new Date(desde);
      if (hasta) where.fecha[Op.lte] = new Date(hasta);
    }

    const partidos = await Partido.findAll({
      where,
      include: includesConCategoria(includesBase, categoriaDelUsuario(req)),
      order: [['fecha', 'ASC']]
    });
    res.json(partidos.map(serialize));
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const partido = await Partido.findByPk(req.params.id, { include: includesBase });
    if (!partido) return res.status(404).json({ message: 'Partido no encontrado.' });
    res.json(serialize(partido));
  } catch (err) { next(err); }
}

function ctrlDia(fecha) {
  if (!fecha) return null;
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function existePartidoDia(idPlantilla, fecha, omitirId = null) {
  const dia = ctrlDia(fecha);
  if (!idPlantilla || !dia) return false;
  const inicio = new Date(`${dia}T00:00:00`);
  const fin = new Date(`${dia}T23:59:59.999`);
  const where = { id_plantilla: idPlantilla, fecha: { [Op.gte]: inicio, [Op.lte]: fin } };
  if (omitirId) where.id = { [Op.ne]: omitirId };
  const contados = await Partido.count({ where });
  return contados > 0;
}

const HORAS_DESCANSO_ENTRE_PARTIDOS = 72;

async function existePartidoReciente(idPlantilla, fecha, omitirId = null) {
  if (!idPlantilla || !fecha) return false;
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return false;
  const inicio = new Date(d.getTime() - HORAS_DESCANSO_ENTRE_PARTIDOS * 60 * 60 * 1000);
  const where = { id_plantilla: idPlantilla, fecha: { [Op.gte]: inicio, [Op.lte]: d } };
  if (omitirId) where.id = { [Op.ne]: omitirId };
  const contados = await Partido.count({ where });
  return contados > 0;
}

function seSolapan(partido, inicioNuevo, finNuevo) {
  const inicioEx = new Date(partido.fecha).getTime();
  const finEx = inicioEx + (partido.plantilla?.categoria?.tiempopartido || DURACION_PARTIDO_DEFECTO) * 60000;
  return inicioNuevo < finEx && inicioEx < finNuevo;
}

async function existePartidoLugar(idLugar, fecha, minutosNuevo, omitirId = null) {
  if (!idLugar || !fecha) return false;
  const inicio = new Date(fecha);
  if (Number.isNaN(inicio.getTime())) return false;
  const finNuevo = inicio.getTime() + (minutosNuevo || DURACION_PARTIDO_DEFECTO) * 60000;
  const margen = DURACION_PARTIDO_DEFECTO * 60000;
  const partidos = await Partido.findAll({
    where: {
      id_lugar: idLugar,
      fecha: { [Op.gte]: new Date(inicio.getTime() - margen), [Op.lte]: new Date(finNuevo) }
    },
    include: [{ model: Plantilla, as: 'plantilla', attributes: ['id'], include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'tiempopartido'] }] }]
  });
  if (omitirId) return partidos.some((p) => String(p.id) !== String(omitirId) && seSolapan(p, inicio.getTime(), finNuevo));
  return partidos.some((p) => seSolapan(p, inicio.getTime(), finNuevo));
}

async function crear(req, res, next) {
  try {
    const { id_plantilla, fecha, id_lugar, id_equipo_local, id_equipo_visitante, resultado_incidencias, incidencias } = req.body;
    if (!id_plantilla || !fecha || !id_equipo_local || !id_equipo_visitante) {
      return res.status(400).json({ message: 'Plantilla, fecha, equipo local y equipo visitante son obligatorios.' });
    }
    if (id_equipo_local === id_equipo_visitante) {
      return res.status(400).json({ message: 'El equipo local y el visitante no pueden ser el mismo.' });
    }
    if (await existePartidoDia(id_plantilla, fecha)) {
      return res.status(409).json({ message: 'Esta plantilla ya tiene un partido ese día.' });
    }
    if (await existePartidoReciente(id_plantilla, fecha)) {
      return res.status(409).json({ message: 'Esta plantilla jugó hace menos de 72 horas.' });
    }
    if (id_lugar && id_equipo_local === PALMA_ID) {
      const plantilla = await Plantilla.findOne({ where: { id: id_plantilla }, include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'tiempopartido'] }] });
      const minutosPartido = plantilla?.categoria?.tiempopartido || DURACION_PARTIDO_DEFECTO;
      if (await existePartidoLugar(id_lugar, fecha, minutosPartido)) {
        return res.status(409).json({ message: 'En esa fecha y hora hay otro partido planificado.' });
      }
    }
    const partido = await Partido.create({
      id_plantilla,
      fecha,
      id_lugar: id_lugar || null,
      id_equipo_local,
      id_equipo_visitante,
      id_usuario: req.user?.id || null,
      incidencias: incidencias || null
    });
    await guardarResultadoIncidencias(partido.id, resultado_incidencias);
    const creado = await Partido.findByPk(partido.id, { include: includesBase });
    res.status(201).json(serialize(creado));
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const partido = await Partido.findByPk(req.params.id);
    if (!partido) return res.status(404).json({ message: 'Partido no encontrado.' });
    const { id_plantilla, fecha, id_lugar, id_equipo_local, id_equipo_visitante, resultado_incidencias, incidencias } = req.body;

    const idPlantillaFinal = id_plantilla !== undefined ? id_plantilla : partido.id_plantilla;
    const fechaFinal = fecha !== undefined ? fecha : partido.fecha;
    const idLocalFinal = id_equipo_local !== undefined ? id_equipo_local : partido.id_equipo_local;
    const idVisitanteFinal = id_equipo_visitante !== undefined ? id_equipo_visitante : partido.id_equipo_visitante;
    const idLugarFinal = id_lugar !== undefined ? id_lugar : partido.id_lugar;

    if (idLocalFinal === idVisitanteFinal) {
      return res.status(400).json({ message: 'El equipo local y el visitante no pueden ser el mismo.' });
    }

    const cambiaCatOFecha = id_plantilla !== undefined || fecha !== undefined;
    const cambiaUbicacion = id_lugar !== undefined && idLugarFinal !== partido.id_lugar || fecha !== undefined;

    if (cambiaCatOFecha && (await existePartidoDia(idPlantillaFinal, fechaFinal, partido.id))) {
      return res.status(409).json({ message: 'Esta plantilla ya tiene un partido ese día.' });
    }
    if (cambiaCatOFecha && (await existePartidoReciente(idPlantillaFinal, fechaFinal, partido.id))) {
      return res.status(409).json({ message: 'Esta plantilla jugó hace menos de 72 horas.' });
    }
    if (idLugarFinal && idLocalFinal === PALMA_ID && cambiaUbicacion) {
      const plantilla = await Plantilla.findOne({ where: { id: idPlantillaFinal }, include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'tiempopartido'] }] });
      const minutosPartido = plantilla?.categoria?.tiempopartido || DURACION_PARTIDO_DEFECTO;
      if (await existePartidoLugar(idLugarFinal, fechaFinal, minutosPartido, partido.id)) {
        return res.status(409).json({ message: 'En esa fecha y hora hay otro partido planificado.' });
      }
    }
    if (id_plantilla !== undefined) partido.id_plantilla = id_plantilla;
    if (fecha !== undefined) partido.fecha = fecha;
    if (id_lugar !== undefined) partido.id_lugar = id_lugar || null;
    if (id_equipo_local !== undefined) {
      partido.id_equipo_local = id_equipo_local;
      if (id_equipo_local !== PALMA_ID) partido.id_lugar = null;
    }
    if (id_equipo_visitante !== undefined) partido.id_equipo_visitante = id_equipo_visitante;
    if (incidencias !== undefined) partido.incidencias = incidencias;
    await partido.save();
    if (resultado_incidencias !== undefined) {
      await guardarResultadoIncidencias(partido.id, resultado_incidencias);
    }
    const actualizado = await Partido.findByPk(partido.id, { include: includesBase });
    res.json(serialize(actualizado));
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Partido.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Partido no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
