const { EquipoJugador, Equipo, Categoria } = require('../models');

const includes = [
  { model: Equipo, as: 'equipo', attributes: ['id', 'nombre', 'escudo'] },
  { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'alias'] }
];

async function listar(req, res, next) {
  try {
    const { id_equipo, id_categoria } = req.query;
    const where = {};
    if (id_equipo) where.id_equipo = id_equipo;
    if (id_categoria) where.id_categoria = id_categoria;

    const items = await EquipoJugador.findAll({
      where,
      include: includes,
      order: [['apellidos', 'ASC'], ['nombre', 'ASC']]
    });
    res.json(items);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const item = await EquipoJugador.findOne({ where: { id: req.params.id }, include: includes });
    if (!item) return res.status(404).json({ message: 'Jugador de equipo no encontrado.' });
    res.json(item);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { id_equipo, id_categoria, nombre, apellidos } = req.body;
    if (!id_equipo || !id_categoria || !nombre || !apellidos) {
      return res.status(400).json({ message: 'Equipo, categoría, nombre y apellidos son obligatorios.' });
    }
    const equipo = await Equipo.findOne({ where: { id: id_equipo } });
    if (!equipo) return res.status(400).json({ message: 'El equipo indicado no existe.' });
    const categoria = await Categoria.findOne({ where: { id: id_categoria } });
    if (!categoria) return res.status(400).json({ message: 'La categoría indicada no existe.' });

    const item = await EquipoJugador.create({ id_equipo, id_categoria, nombre, apellidos });
    const completo = await EquipoJugador.findOne({ where: { id: item.id }, include: includes });
    res.status(201).json(completo);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const item = await EquipoJugador.findOne({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ message: 'Jugador de equipo no encontrado.' });
    const { id_equipo, id_categoria, nombre, apellidos } = req.body;
    if (id_equipo !== undefined) {
      const equipo = await Equipo.findOne({ where: { id: id_equipo } });
      if (!equipo) return res.status(400).json({ message: 'El equipo indicado no existe.' });
      item.id_equipo = id_equipo;
    }
    if (id_categoria !== undefined) {
      const categoria = await Categoria.findOne({ where: { id: id_categoria } });
      if (!categoria) return res.status(400).json({ message: 'La categoría indicada no existe.' });
      item.id_categoria = id_categoria;
    }
    if (nombre !== undefined) item.nombre = nombre;
    if (apellidos !== undefined) item.apellidos = apellidos;
    await item.save();
    const completo = await EquipoJugador.findOne({ where: { id: item.id }, include: includes });
    res.json(completo);
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await EquipoJugador.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Jugador de equipo no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
