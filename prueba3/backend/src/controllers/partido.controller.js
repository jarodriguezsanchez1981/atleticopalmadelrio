const { Op } = require('sequelize');
const { Partido, Categoria, Temporada, Lugar } = require('../models');

const includesBase = [
  {
    model: Categoria,
    as: 'categoria',
    attributes: ['id', 'nombre', 'id_temporada'],
    include: [{ model: Temporada, as: 'temporada', attributes: ['id', 'nombre'] }]
  },
  { model: Lugar, as: 'lugar', attributes: ['id', 'nombre'] }
];

async function listar(req, res, next) {
  try {
    const { id_categoria, id_temporada, id_lugar, equipo_rival, desde, hasta } = req.query;
    const where = {};
    if (id_categoria) where.id_categoria = id_categoria;
    if (id_lugar) where.id_lugar = id_lugar;
    if (equipo_rival) where.equipo_rival = { [Op.like]: `%${equipo_rival}%` };
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
        { model: Lugar, as: 'lugar', attributes: ['id', 'nombre'] }
      ],
      order: [['fecha', 'ASC']]
    });
    res.json(partidos);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const partido = await Partido.findByPk(req.params.id, { include: includesBase });
    if (!partido) return res.status(404).json({ message: 'Partido no encontrado.' });
    res.json(partido);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { id_categoria, fecha, id_lugar, equipo_rival, incidencias } = req.body;
    if (!id_categoria || !fecha || !id_lugar || !equipo_rival) {
      return res.status(400).json({ message: 'Categoría, fecha, lugar y equipo rival son obligatorios.' });
    }
    const partido = await Partido.create({ id_categoria, fecha, id_lugar, equipo_rival, incidencias });
    const creado = await Partido.findByPk(partido.id, { include: includesBase });
    res.status(201).json(creado);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const partido = await Partido.findByPk(req.params.id);
    if (!partido) return res.status(404).json({ message: 'Partido no encontrado.' });
    const { id_categoria, fecha, id_lugar, equipo_rival, incidencias } = req.body;
    if (id_categoria !== undefined) partido.id_categoria = id_categoria;
    if (fecha !== undefined) partido.fecha = fecha;
    if (id_lugar !== undefined) partido.id_lugar = id_lugar;
    if (equipo_rival !== undefined) partido.equipo_rival = equipo_rival;
    if (incidencias !== undefined) partido.incidencias = incidencias;
    await partido.save();
    const actualizado = await Partido.findByPk(partido.id, { include: includesBase });
    res.json(actualizado);
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
