const { Op } = require('sequelize');
const { Partido, Categoria } = require('../models');

// Soporta los filtros pedidos: temporada (via categoría), categoría y equipo rival,
// además de rango de fechas (usado por la pantalla de Calendario).
async function listar(req, res, next) {
  try {
    const { id_categoria, temporada, equipo_rival, desde, hasta } = req.query;
    const where = {};
    if (id_categoria) where.id_categoria = id_categoria;
    if (equipo_rival) where.equipo_rival = { [Op.like]: `%${equipo_rival}%` };
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha[Op.gte] = new Date(desde);
      if (hasta) where.fecha[Op.lte] = new Date(hasta);
    }

    const categoriaWhere = temporada ? { temporada } : undefined;

    const partidos = await Partido.findAll({
      where,
      include: [{
        model: Categoria,
        as: 'categoria',
        attributes: ['id', 'nombre', 'temporada'],
        where: categoriaWhere
      }],
      order: [['fecha', 'ASC']]
    });
    res.json(partidos);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const partido = await Partido.findByPk(req.params.id, {
      include: [{ model: Categoria, as: 'categoria' }]
    });
    if (!partido) return res.status(404).json({ message: 'Partido no encontrado.' });
    res.json(partido);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { id_categoria, fecha, lugar, equipo_rival, resultado, incidencias } = req.body;
    if (!id_categoria || !fecha || !lugar || !equipo_rival) {
      return res.status(400).json({ message: 'Categoría, fecha, lugar y equipo rival son obligatorios.' });
    }
    const partido = await Partido.create({ id_categoria, fecha, lugar, equipo_rival, resultado, incidencias });
    res.status(201).json(partido);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const partido = await Partido.findByPk(req.params.id);
    if (!partido) return res.status(404).json({ message: 'Partido no encontrado.' });
    const { id_categoria, fecha, lugar, equipo_rival, resultado, incidencias } = req.body;
    if (id_categoria !== undefined) partido.id_categoria = id_categoria;
    if (fecha !== undefined) partido.fecha = fecha;
    if (lugar !== undefined) partido.lugar = lugar;
    if (equipo_rival !== undefined) partido.equipo_rival = equipo_rival;
    if (resultado !== undefined) partido.resultado = resultado;
    if (incidencias !== undefined) partido.incidencias = incidencias;
    await partido.save();
    res.json(partido);
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
