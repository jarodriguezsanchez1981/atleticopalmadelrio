const { Op } = require('sequelize');
const { Partido, Categoria, Temporada, Lugar, Equipo, PartidoJugador, Jugador, Resultado, Jornada } = require('../models');

const DURACION_PARTIDO_DEFECTO = 90;

function normalizeIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(Number).filter(Boolean))];
}

/** Guarda (upsert) el resultado del partido en la tabla resultados. */
async function guardarResultado(idPartido, resultado, incidencias) {
  await Resultado.destroy({ where: { id_partido: idPartido } });
  if (resultado == null || resultado === '') return;
  await Resultado.create({ id_partido: idPartido, resultado: String(resultado), incidencias: incidencias || null });
}

async function guardarConvocados(idPartido, idsJugadores) {
  await PartidoJugador.destroy({ where: { id_partido: idPartido } });
  const filas = idsJugadores.map((id_jugador) => ({ id_partido: idPartido, id_jugador }));
  if (filas.length) await PartidoJugador.bulkCreate(filas);
}

const includesBase = [
  {
    model: Categoria,
    as: 'categoria',
    attributes: ['id', 'nombre', 'alias', 'id_temporada', 'id_tipofutbol', 'tiempopartido'],
    include: [{ model: Temporada, as: 'temporada', attributes: ['id', 'nombre'] }]
  },
  { model: Lugar, as: 'lugar', attributes: ['id', 'nombre'] },
  { model: Equipo, as: 'equipo', attributes: ['id', 'nombre', 'escudo', 'direccion', 'localidad'] },
  { model: Jornada, as: 'jornada', attributes: ['id', 'jornada', 'fecha'] },
  {
    model: PartidoJugador,
    as: 'convocados',
    attributes: ['id', 'id_jugador'],
    include: [{ model: Jugador, as: 'jugador', attributes: ['id', 'nombre', 'apellidos'] }]
  },
  { model: Resultado, as: 'Resultados', attributes: ['id', 'resultado', 'incidencias'] }
];
function serialize(partido) {
  const json = partido.toJSON ? partido.toJSON() : partido;
  json.ids_jugadores = (json.convocados || []).map((c) => c.id_jugador);
  const res = Array.isArray(json.Resultados) ? json.Resultados[0] : null;
  if (res) {
    json.resultado_valor = res.resultado;
    json.resultado_incidencias = res.incidencias;
  }
  return json;
}

async function listar(req, res, next) {
  try {
    const { id_categoria, id_temporada, id_lugar, id_equipo, desde, hasta } = req.query;
    const where = {};
    if (id_categoria) where.id_categoria = id_categoria;
    if (id_lugar) where.id_lugar = id_lugar;
    if (id_equipo) where.id_equipo = id_equipo;
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha[Op.gte] = new Date(desde);
      if (hasta) where.fecha[Op.lte] = new Date(hasta);
    }

    const categoriaWhere = id_temporada ? { id_temporada } : undefined;

    const partidos = await Partido.findAll({
      where,
      include: [
        {
          model: Categoria,
          as: 'categoria',
          attributes: ['id', 'nombre', 'alias', 'id_temporada', 'id_tipofutbol', 'tiempopartido'],
          where: categoriaWhere,
          include: [{ model: Temporada, as: 'temporada', attributes: ['id', 'nombre'] }]
        },
        { model: Lugar, as: 'lugar', attributes: ['id', 'nombre'] },
        { model: Equipo, as: 'equipo', attributes: ['id', 'nombre', 'escudo', 'direccion', 'localidad'] },
        {
          model: PartidoJugador,
          as: 'convocados',
          attributes: ['id', 'id_jugador'],
          include: [{ model: Jugador, as: 'jugador', attributes: ['id', 'nombre', 'apellidos'] }]
        },
        { model: Resultado, as: 'Resultados', attributes: ['id', 'resultado', 'incidencias'] }
      ],
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

async function existePartidoDia(idCategoria, fecha, omitirId = null) {
  const dia = ctrlDia(fecha);
  if (!idCategoria || !dia) return false;
  const inicio = new Date(`${dia}T00:00:00`);
  const fin = new Date(`${dia}T23:59:59.999`);
  const where = { id_categoria: idCategoria, fecha: { [Op.gte]: inicio, [Op.lte]: fin } };
  if (omitirId) where.id = { [Op.ne]: omitirId };
  const contados = await Partido.count({ where });
  return contados > 0;
}

const HORAS_DESCANSO_ENTRE_PARTIDOS = 72;

async function existePartidoReciente(idCategoria, fecha, omitirId = null) {
  if (!idCategoria || !fecha) return false;
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return false;
  const inicio = new Date(d.getTime() - HORAS_DESCANSO_ENTRE_PARTIDOS * 60 * 60 * 1000);
  const where = { id_categoria: idCategoria, fecha: { [Op.gte]: inicio, [Op.lte]: d } };
  if (omitirId) where.id = { [Op.ne]: omitirId };
  const contados = await Partido.count({ where });
  return contados > 0;
}

function seSolapan(partido, inicioNuevo, finNuevo) {
  const inicioEx = new Date(partido.fecha).getTime();
  const finEx = inicioEx + (partido.categoria?.tiempopartido || DURACION_PARTIDO_DEFECTO) * 60000;
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
    include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'tiempopartido'] }]
  });
  if (omitirId) return partidos.some((p) => String(p.id) !== String(omitirId) && seSolapan(p, inicio.getTime(), finNuevo));
  return partidos.some((p) => seSolapan(p, inicio.getTime(), finNuevo));
}

async function crear(req, res, next) {
  try {
    const { id_categoria, fecha, id_lugar, id_jornada, id_equipo, es_local, incidencias } = req.body;
    const esLocal = es_local !== undefined ? !!es_local : true;
    if (!id_categoria || !fecha || !id_equipo) {
      return res.status(400).json({ message: 'Categoría, fecha y equipo son obligatorios.' });
    }
    if (await existePartidoDia(id_categoria, fecha)) {
      return res.status(409).json({ message: 'Esta categoría ya tiene un partido ese día.' });
    }
    if (await existePartidoReciente(id_categoria, fecha)) {
      return res.status(409).json({ message: 'Esta categoría jugó hace menos de 72 horas.' });
    }
    const categoria = await Categoria.findOne({ where: { id: id_categoria }, attributes: ['id', 'tiempopartido'] });
    const minutosPartido = categoria?.tiempopartido || DURACION_PARTIDO_DEFECTO;
    if (esLocal && id_lugar && await existePartidoLugar(id_lugar, fecha, minutosPartido)) {
      return res.status(409).json({ message: 'Ese lugar ya está ocupado a esa hora por otro partido.' });
    }
    const partido = await Partido.create({
      id_categoria, fecha, id_lugar: id_lugar || null, id_jornada: id_jornada || null, id_equipo, es_local: esLocal ? 1 : 0, id_usuario: req.user?.id || null, incidencias
    });
    const idsJugadores = normalizeIds(req.body.ids_jugadores);
    await guardarConvocados(partido.id, idsJugadores);
    await guardarResultado(partido.id, req.body.resultado, req.body.resultado_incidencias);
    const creado = await Partido.findByPk(partido.id, { include: includesBase });
    res.status(201).json(serialize(creado));
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const partido = await Partido.findByPk(req.params.id);
    if (!partido) return res.status(404).json({ message: 'Partido no encontrado.' });
    const { id_categoria, fecha, id_lugar, id_jornada, id_equipo, es_local, incidencias } = req.body;
    const esLocalFinal = es_local !== undefined ? !!es_local : !!partido.es_local;
    const idLugarFinal = esLocalFinal
      ? (id_lugar !== undefined ? id_lugar : partido.id_lugar)
      : null;
    const idCategoriaFinal = id_categoria !== undefined ? id_categoria : partido.id_categoria;
    const fechaFinal = fecha !== undefined ? fecha : partido.fecha;

    const cambiaCatOFecha = id_categoria !== undefined || fecha !== undefined;
    const cambiaUbicacion = es_local !== undefined && !!es_local !== !!partido.es_local
      || (id_lugar !== undefined && idLugarFinal !== partido.id_lugar)
      || fecha !== undefined;

    if (cambiaCatOFecha && (await existePartidoDia(idCategoriaFinal, fechaFinal, partido.id))) {
      return res.status(409).json({ message: 'Esta categoría ya tiene un partido ese día.' });
    }
    if (cambiaCatOFecha && (await existePartidoReciente(idCategoriaFinal, fechaFinal, partido.id))) {
      return res.status(409).json({ message: 'Esta categoría jugó hace menos de 72 horas.' });
    }
    if (esLocalFinal && idLugarFinal && cambiaUbicacion) {
      const categoria = await Categoria.findOne({ where: { id: idCategoriaFinal }, attributes: ['id', 'tiempopartido'] });
      const minutosPartido = categoria?.tiempopartido || DURACION_PARTIDO_DEFECTO;
      if (await existePartidoLugar(idLugarFinal, fechaFinal, minutosPartido, partido.id)) {
        return res.status(409).json({ message: 'Ese lugar ya está ocupado a esa hora por otro partido.' });
      }
    }
    if (id_categoria !== undefined) partido.id_categoria = id_categoria;
    if (fecha !== undefined) partido.fecha = fecha;
    if (es_local !== undefined) {
      partido.es_local = es_local ? 1 : 0;
      if (!es_local) partido.id_lugar = null;
    }
    if (id_lugar !== undefined && esLocalFinal) partido.id_lugar = id_lugar;
    if (id_jornada !== undefined) partido.id_jornada = id_jornada || null;
    if (id_equipo !== undefined) partido.id_equipo = id_equipo;
    if (incidencias !== undefined) partido.incidencias = incidencias;
    await partido.save();
    if (req.body.ids_jugadores !== undefined) {
      await guardarConvocados(partido.id, normalizeIds(req.body.ids_jugadores));
    }
    if (req.body.resultado !== undefined || req.body.resultado_incidencias !== undefined) {
      const resultado = req.body.resultado !== undefined ? req.body.resultado : (await Resultado.findOne({ where: { id_partido: partido.id } }))?.resultado;
      const resultadoIncidencias = req.body.resultado_incidencias !== undefined
        ? req.body.resultado_incidencias
        : (await Resultado.findOne({ where: { id_partido: partido.id } }))?.incidencias;
      await guardarResultado(partido.id, resultado, resultadoIncidencias);
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
