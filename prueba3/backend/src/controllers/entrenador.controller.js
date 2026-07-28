const { Entrenador, Categoria, Temporada } = require('../models');

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
    const entrenadores = await Entrenador.findAll({
      where: Object.keys(where).length ? where : undefined,
      include: includes,
      order: [['apellidos', 'ASC']]
    });
    res.json(entrenadores);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const entrenador = await Entrenador.findByPk(req.params.id, { include: includes });
    if (!entrenador) return res.status(404).json({ message: 'Entrenador no encontrado.' });
    res.json(entrenador);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre, apellidos, dni, id_categoria, id_temporada } = req.body;
    if (!nombre || !apellidos || !dni || !id_categoria || !id_temporada) {
      return res.status(400).json({ message: 'Nombre, apellidos, DNI, categoría y temporada son obligatorios.' });
    }
    const entrenador = await Entrenador.create({ nombre, apellidos, dni, id_categoria, id_temporada });
    const creado = await Entrenador.findByPk(entrenador.id, { include: includes });
    res.status(201).json(creado);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const entrenador = await Entrenador.findByPk(req.params.id);
    if (!entrenador) return res.status(404).json({ message: 'Entrenador no encontrado.' });
    const { nombre, apellidos, dni, id_categoria, id_temporada } = req.body;
    if (nombre !== undefined) entrenador.nombre = nombre;
    if (apellidos !== undefined) entrenador.apellidos = apellidos;
    if (dni !== undefined) entrenador.dni = dni;
    if (id_categoria !== undefined) entrenador.id_categoria = id_categoria;
    if (id_temporada !== undefined) entrenador.id_temporada = id_temporada;
    await entrenador.save();
    const actualizado = await Entrenador.findByPk(entrenador.id, { include: includes });
    res.json(actualizado);
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Entrenador.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Entrenador no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
