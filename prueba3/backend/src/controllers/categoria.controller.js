const { Categoria, Entrenador, Temporada } = require('../models');

const includes = [
  {
    model: Temporada,
    as: 'temporada',
    attributes: ['id', 'nombre']
  },
  {
    model: Entrenador,
    as: 'entrenador',
    attributes: ['id', 'nombre', 'apellidos', 'dni'],
    required: false
  }
];

async function listar(req, res, next) {
  try {
    const { id_temporada } = req.query;
    const where = id_temporada ? { id_temporada } : undefined;
    const categorias = await Categoria.findAll({
      where,
      include: includes,
      order: [[{ model: Temporada, as: 'temporada' }, 'nombre', 'DESC'], ['nombre', 'ASC']]
    });
    res.json(categorias);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const categoria = await Categoria.findByPk(req.params.id, { include: includes });
    if (!categoria) return res.status(404).json({ message: 'Categoría no encontrada.' });
    res.json(categoria);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre, id_temporada, id_entrenador } = req.body;
    if (!nombre || !id_temporada) {
      return res.status(400).json({ message: 'Nombre y temporada son obligatorios.' });
    }
    const temporada = await Temporada.findByPk(id_temporada);
    if (!temporada) return res.status(400).json({ message: 'La temporada indicada no existe.' });
    if (id_entrenador) {
      const existe = await Entrenador.findByPk(id_entrenador);
      if (!existe) return res.status(400).json({ message: 'El entrenador indicado no existe.' });
    }
    const categoria = await Categoria.create({
      nombre,
      id_temporada,
      id_entrenador: id_entrenador || null
    });
    const creada = await Categoria.findByPk(categoria.id, { include: includes });
    res.status(201).json(creada);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const categoria = await Categoria.findByPk(req.params.id);
    if (!categoria) return res.status(404).json({ message: 'Categoría no encontrada.' });
    const { nombre, id_temporada, id_entrenador } = req.body;
    if (nombre !== undefined) categoria.nombre = nombre;
    if (id_temporada !== undefined) {
      const temporada = await Temporada.findByPk(id_temporada);
      if (!temporada) return res.status(400).json({ message: 'La temporada indicada no existe.' });
      categoria.id_temporada = id_temporada;
    }
    if (id_entrenador !== undefined) {
      if (id_entrenador) {
        const existe = await Entrenador.findByPk(id_entrenador);
        if (!existe) return res.status(400).json({ message: 'El entrenador indicado no existe.' });
      }
      categoria.id_entrenador = id_entrenador || null;
    }
    await categoria.save();
    const actualizada = await Categoria.findByPk(categoria.id, { include: includes });
    res.json(actualizada);
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Categoria.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Categoría no encontrada.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
