const { Jugador, Categoria, Temporada } = require('../models');

const includes = [
  { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'id_temporada'] },
  { model: Temporada, as: 'temporada', attributes: ['id', 'nombre'] }
];

async function listar(req, res, next) {
  try {
    const { id_categoria, id_temporada } = req.query;
    const where = {};
    if (id_categoria) where.id_categoria = id_categoria;
    if (id_temporada) where.id_temporada = id_temporada;
    const jugadores = await Jugador.findAll({
      where: Object.keys(where).length ? where : undefined,
      include: includes,
      order: [['apellidos', 'ASC']]
    });
    res.json(jugadores);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const jugador = await Jugador.findByPk(req.params.id, { include: includes });
    if (!jugador) return res.status(404).json({ message: 'Jugador no encontrado.' });
    res.json(jugador);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre, apellidos, dni, id_categoria, id_temporada } = req.body;
    if (!nombre || !apellidos || !dni || !id_categoria || !id_temporada) {
      return res.status(400).json({ message: 'Nombre, apellidos, DNI, categoría y temporada son obligatorios.' });
    }
    const jugador = await Jugador.create({ nombre, apellidos, dni, id_categoria, id_temporada });
    const creado = await Jugador.findByPk(jugador.id, { include: includes });
    res.status(201).json(creado);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const jugador = await Jugador.findByPk(req.params.id);
    if (!jugador) return res.status(404).json({ message: 'Jugador no encontrado.' });
    const { nombre, apellidos, dni, id_categoria, id_temporada } = req.body;
    if (nombre !== undefined) jugador.nombre = nombre;
    if (apellidos !== undefined) jugador.apellidos = apellidos;
    if (dni !== undefined) jugador.dni = dni;
    if (id_categoria !== undefined) jugador.id_categoria = id_categoria;
    if (id_temporada !== undefined) jugador.id_temporada = id_temporada;
    await jugador.save();
    const actualizado = await Jugador.findByPk(jugador.id, { include: includes });
    res.json(actualizado);
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Jugador.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Jugador no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
