const { Jugador, Categoria } = require('../models');

async function listar(req, res, next) {
  try {
    const { id_categoria } = req.query;
    const where = id_categoria ? { id_categoria } : undefined;
    const jugadores = await Jugador.findAll({
      where,
      include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'temporada'] }],
      order: [['apellidos', 'ASC']]
    });
    res.json(jugadores);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const jugador = await Jugador.findByPk(req.params.id, {
      include: [{ model: Categoria, as: 'categoria' }]
    });
    if (!jugador) return res.status(404).json({ message: 'Jugador no encontrado.' });
    res.json(jugador);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre, apellidos, dni, id_categoria } = req.body;
    if (!nombre || !apellidos || !dni || !id_categoria) {
      return res.status(400).json({ message: 'Nombre, apellidos, DNI y categoría son obligatorios.' });
    }
    const jugador = await Jugador.create({ nombre, apellidos, dni, id_categoria });
    res.status(201).json(jugador);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const jugador = await Jugador.findByPk(req.params.id);
    if (!jugador) return res.status(404).json({ message: 'Jugador no encontrado.' });
    const { nombre, apellidos, dni, id_categoria } = req.body;
    if (nombre !== undefined) jugador.nombre = nombre;
    if (apellidos !== undefined) jugador.apellidos = apellidos;
    if (dni !== undefined) jugador.dni = dni;
    if (id_categoria !== undefined) jugador.id_categoria = id_categoria;
    await jugador.save();
    res.json(jugador);
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
