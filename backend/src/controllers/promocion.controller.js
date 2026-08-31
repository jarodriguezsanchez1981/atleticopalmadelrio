const { Promocion, Plantilla, Categoria, Temporada, Jugador } = require('../models');

const includes = [
  {
    model: Plantilla,
    as: 'plantilla',
    attributes: ['id', 'id_categoria', 'id_temporada', 'id_division'],
    include: [
      { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'orden'] },
      { model: Temporada, as: 'temporada', attributes: ['id', 'nombre'] }
    ]
  },
  { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'orden'] },
  { model: Jugador, as: 'jugador', attributes: ['id', 'nombre', 'apellidos', 'foto'] }
];

function serializePromocion(promocion) {
  return promocion.toJSON ? promocion.toJSON() : promocion;
}

async function listar(req, res, next) {
  try {
    const promociones = await Promocion.findAll({
      include: includes,
      order: [['id', 'ASC']]
    });
    res.json(promociones.map(serializePromocion));
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const promocion = await Promocion.findOne({ where: { id: req.params.id }, include: includes });
    if (!promocion) return res.status(404).json({ message: 'Promoción no encontrada.' });
    res.json(serializePromocion(promocion));
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { id_plantilla, id_categoria, id_jugador } = req.body;
    if (!id_plantilla || !id_categoria || !id_jugador) {
      return res.status(400).json({ message: 'Plantilla, categoría y jugador son obligatorios.' });
    }
    const plantilla = await Plantilla.findOne({ where: { id: id_plantilla } });
    if (!plantilla) return res.status(400).json({ message: 'La plantilla indicada no existe.' });
    const categoria = await Categoria.findOne({ where: { id: id_categoria } });
    if (!categoria) return res.status(400).json({ message: 'La categoría indicada no existe.' });
    const jugador = await Jugador.findOne({ where: { id: id_jugador } });
    if (!jugador) return res.status(400).json({ message: 'El jugador indicado no existe.' });

    const promocion = await Promocion.create({ id_plantilla, id_categoria, id_jugador });
    const completa = await Promocion.findOne({ where: { id: promocion.id }, include: includes });
    res.status(201).json(serializePromocion(completa));
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const promocion = await Promocion.findOne({ where: { id: req.params.id } });
    if (!promocion) return res.status(404).json({ message: 'Promoción no encontrada.' });
    const { id_plantilla, id_categoria, id_jugador } = req.body;
    if (id_plantilla !== undefined) {
      const plantilla = await Plantilla.findOne({ where: { id: id_plantilla } });
      if (!plantilla) return res.status(400).json({ message: 'La plantilla indicada no existe.' });
      promocion.id_plantilla = id_plantilla;
    }
    if (id_categoria !== undefined) {
      const categoria = await Categoria.findOne({ where: { id: id_categoria } });
      if (!categoria) return res.status(400).json({ message: 'La categoría indicada no existe.' });
      promocion.id_categoria = id_categoria;
    }
    if (id_jugador !== undefined) {
      const jugador = await Jugador.findOne({ where: { id: id_jugador } });
      if (!jugador) return res.status(400).json({ message: 'El jugador indicado no existe.' });
      promocion.id_jugador = id_jugador;
    }
    await promocion.save();
    const actualizada = await Promocion.findOne({ where: { id: promocion.id }, include: includes });
    res.json(serializePromocion(actualizada));
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Promocion.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Promoción no encontrada.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
