const { Entrenador, Categoria, Temporada, Titulo } = require('../models');

const includeCategorias = {
  model: Categoria,
  as: 'categorias',
  attributes: ['id', 'nombre', 'id_temporada'],
  through: { attributes: [] }
};

const includeEntrenador = [
  { model: Temporada, as: 'temporada', attributes: ['id', 'nombre'] },
  { model: Titulo, as: 'titulo', attributes: ['id', 'nombre'] },
  includeCategorias
];

function normalizeCategoriasIds(body) {
  if (Array.isArray(body.ids_categorias)) return body.ids_categorias.map(Number).filter(Boolean);
  if (Array.isArray(body.categorias)) {
    return body.categorias.map((c) => (typeof c === 'object' ? Number(c.id) : Number(c))).filter(Boolean);
  }
  return null;
}

function serializeEntrenador(entrenador) {
  const json = entrenador.toJSON ? entrenador.toJSON() : entrenador;
  json.ids_categorias = (json.categorias || []).map((c) => c.id);
  return json;
}

async function listar(req, res, next) {
  try {
    const { id_temporada } = req.query;
    const where = {};
    if (id_temporada) where.id_temporada = id_temporada;
    const entrenadores = await Entrenador.findAll({
      where: Object.keys(where).length ? where : undefined,
      include: includeEntrenador,
      order: [['apellidos', 'ASC']]
    });
    res.json(entrenadores.map(serializeEntrenador));
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const entrenador = await Entrenador.findByPk(req.params.id, { include: includeEntrenador });
    if (!entrenador) return res.status(404).json({ message: 'Entrenador no encontrado.' });
    res.json(serializeEntrenador(entrenador));
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre, apellidos, dni, foto, id_titulo, id_temporada } = req.body;
    const idsCategorias = normalizeCategoriasIds(req.body) || [];
    if (!nombre || !apellidos || !dni || !id_temporada) {
      return res.status(400).json({ message: 'Nombre, apellidos, DNI y temporada son obligatorios.' });
    }
    const entrenador = await Entrenador.create({
      nombre, apellidos, dni, foto: foto || null, id_titulo: id_titulo || null, id_temporada
    });
    if (idsCategorias.length) await entrenador.setCategorias(idsCategorias);
    const completo = await Entrenador.findByPk(entrenador.id, { include: includeEntrenador });
    res.status(201).json(serializeEntrenador(completo));
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const entrenador = await Entrenador.findByPk(req.params.id);
    if (!entrenador) return res.status(404).json({ message: 'Entrenador no encontrado.' });
    const { nombre, apellidos, dni, foto, id_titulo, id_temporada } = req.body;
    const idsCategorias = normalizeCategoriasIds(req.body);
    if (nombre !== undefined) entrenador.nombre = nombre;
    if (apellidos !== undefined) entrenador.apellidos = apellidos;
    if (dni !== undefined) entrenador.dni = dni;
    if (foto !== undefined) entrenador.foto = foto || null;
    if (id_titulo !== undefined) entrenador.id_titulo = id_titulo || null;
    if (id_temporada !== undefined) entrenador.id_temporada = id_temporada;
    await entrenador.save();
    if (idsCategorias) await entrenador.setCategorias(idsCategorias);
    const actualizado = await Entrenador.findByPk(entrenador.id, { include: includeEntrenador });
    res.json(serializeEntrenador(actualizado));
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