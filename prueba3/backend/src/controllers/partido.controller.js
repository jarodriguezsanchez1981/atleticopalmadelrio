const { Op } = require('sequelize');
const { Partido, Categoria, Temporada, Lugar, Equipo, PartidoJugador, Jugador } = require('../models');

function normalizeIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(Number).filter(Boolean))];
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
    attributes: ['id', 'nombre', 'id_temporada'],
    include: [{ model: Temporada, as: 'temporada', attributes: ['id', 'nombre'] }]
  },
  { model: Lugar, as: 'lugar', attributes: ['id', 'nombre'] },
  { model: Equipo, as: 'equipo', attributes: ['id', 'nombre'] },
  {
    model: PartidoJugador,
    as: 'convocados',
    attributes: ['id', 'id_jugador'],
    include: [{ model: Jugador, as: 'jugador', attributes: ['id', 'nombre', 'apellidos'] }]
  }
];

function serialize(partido) {
  const json = partido.toJSON ? partido.toJSON() : partido;
  json.ids_jugadores = (json.convocados || []).map((c) => c.id_jugador);
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
          attributes: ['id', 'nombre', 'id_temporada'],
          where: categoriaWhere,
          include: [{ model: Temporada, as: 'temporada', attributes: ['id', 'nombre'] }]
        },
        { model: Lugar, as: 'lugar', attributes: ['id', 'nombre'] },
        { model: Equipo, as: 'equipo', attributes: ['id', 'nombre'] },
        {
          model: PartidoJugador,
          as: 'convocados',
          attributes: ['id', 'id_jugador'],
          include: [{ model: Jugador, as: 'jugador', attributes: ['id', 'nombre', 'apellidos'] }]
        }
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

async function crear(req, res, next) {
  try {
    const { id_categoria, fecha, id_lugar, id_equipo, es_local, incidencias } = req.body;
    const esLocal = es_local !== undefined ? !!es_local : true;
    if (!id_categoria || !fecha || !id_equipo) {
      return res.status(400).json({ message: 'Categoría, fecha y equipo son obligatorios.' });
    }
    if (esLocal && !id_lugar) {
      return res.status(400).json({ message: 'El lugar es obligatorio para partidos como local.' });
    }
    if (await existePartidoDia(id_categoria, fecha)) {
      return res.status(409).json({ message: 'Esta categoría ya tiene un partido ese día.' });
    }
    const partido = await Partido.create({
      id_categoria, fecha, id_lugar: esLocal ? id_lugar : null, id_equipo, es_local: esLocal ? 1 : 0, id_usuario: req.user?.id || null, incidencias
    });
    const idsJugadores = normalizeIds(req.body.ids_jugadores);
    await guardarConvocados(partido.id, idsJugadores);
    const creado = await Partido.findByPk(partido.id, { include: includesBase });
    res.status(201).json(serialize(creado));
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const partido = await Partido.findByPk(req.params.id);
    if (!partido) return res.status(404).json({ message: 'Partido no encontrado.' });
    const { id_categoria, fecha, id_lugar, id_equipo, es_local, incidencias } = req.body;
    if (id_categoria !== undefined) partido.id_categoria = id_categoria;
    if (fecha !== undefined) partido.fecha = fecha;
    if (id_categoria !== undefined || fecha !== undefined) {
      const catFinal = id_categoria !== undefined ? id_categoria : partido.id_categoria;
      const fechaFinal = fecha !== undefined ? fecha : partido.fecha;
      if (await existePartidoDia(catFinal, fechaFinal, partido.id)) {
        return res.status(409).json({ message: 'Esta categoría ya tiene un partido ese día.' });
      }
    }
    if (es_local !== undefined) {
      partido.es_local = es_local ? 1 : 0;
      if (!es_local) partido.id_lugar = null;
    }
    if (id_lugar !== undefined && (!es_local || partido.es_local)) partido.id_lugar = es_local ? id_lugar : null;
    if (id_equipo !== undefined) partido.id_equipo = id_equipo;
    if (incidencias !== undefined) partido.incidencias = incidencias;
    await partido.save();
    if (req.body.ids_jugadores !== undefined) {
      await guardarConvocados(partido.id, normalizeIds(req.body.ids_jugadores));
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
