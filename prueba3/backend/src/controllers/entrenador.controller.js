const { Entrenador, Categoria, Temporada, Titulo } = require('../models');
const { validarDNI } = require('../utils/dni.utils');

const includeCategorias = {
  model: Categoria,
  as: 'categorias',
  attributes: ['id', 'nombre', 'id_temporada'],
  through: { attributes: [] }
};

const includeTitulos = {
  model: Titulo,
  as: 'titulos',
  attributes: ['id', 'nombre'],
  through: { attributes: [] }
};

const includeEntrenador = [
  { model: Temporada, as: 'temporada', attributes: ['id', 'nombre'] },
  includeTitulos,
  includeCategorias
];

function normalizeCategoriasIds(body) {
  if (Array.isArray(body.ids_categorias)) return body.ids_categorias.map(Number).filter(Boolean);
  if (Array.isArray(body.categorias)) {
    return body.categorias.map((c) => (typeof c === 'object' ? Number(c.id) : Number(c))).filter(Boolean);
  }
  return null;
}

function normalizeTitulosIds(body) {
  if (Array.isArray(body.ids_titulos)) return body.ids_titulos.map(Number).filter(Boolean);
  if (Array.isArray(body.titulos)) {
    return body.titulos.map((t) => (typeof t === 'object' ? Number(t.id) : Number(t))).filter(Boolean);
  }
  return null;
}

function serializeEntrenador(entrenador) {
  const json = entrenador.toJSON ? entrenador.toJSON() : entrenador;
  json.ids_categorias = (json.categorias || []).map((c) => c.id);
  json.ids_titulos = (json.titulos || []).map((t) => t.id);
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
    const entrenador = await Entrenador.findOne({ where: { id: req.params.id }, include: includeEntrenador });
    if (!entrenador) return res.status(404).json({ message: 'Entrenador no encontrado.' });
    res.json(serializeEntrenador(entrenador));
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre, apellidos, dni, foto, id_temporada } = req.body;
    const idsCategorias = normalizeCategoriasIds(req.body) || [];
    const idsTitulos = normalizeTitulosIds(req.body) || [];
    if (!nombre || !apellidos || !dni || !id_temporada) {
      return res.status(400).json({ message: 'Nombre, apellidos, DNI y temporada son obligatorios.' });
    }
    if (!validarDNI(dni)) {
      return res.status(400).json({ message: 'El DNI introducido no es válido.' });
    }
    const entrenador = await Entrenador.create({
      nombre, apellidos, dni, foto: foto || null, id_temporada
    });
    if (idsCategorias.length) {
      await entrenador.setCategorias(idsCategorias);
      await Categoria.update({ id_entrenador: entrenador.id }, { where: { id: idsCategorias } });
    }
    if (idsTitulos.length) await entrenador.setTitulos(idsTitulos);
    const completo = await Entrenador.findOne({ where: { id: entrenador.id }, include: includeEntrenador });
    res.status(201).json(serializeEntrenador(completo));
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const entrenador = await Entrenador.findOne({ where: { id: req.params.id }, include: includeCategorias });
    if (!entrenador) return res.status(404).json({ message: 'Entrenador no encontrado.' });
    const idsCategoriasPrevias = (entrenador.categorias || []).map((c) => c.id);
    const { nombre, apellidos, dni, foto, id_temporada } = req.body;
    const idsCategorias = normalizeCategoriasIds(req.body);
    const idsTitulos = normalizeTitulosIds(req.body);
    if (nombre !== undefined) entrenador.nombre = nombre;
    if (apellidos !== undefined) entrenador.apellidos = apellidos;
    if (dni !== undefined) {
      if (!validarDNI(dni)) {
        return res.status(400).json({ message: 'El DNI introducido no es válido.' });
      }
      entrenador.dni = dni;
    }
    if (foto !== undefined) entrenador.foto = foto || null;
    if (id_temporada !== undefined) entrenador.id_temporada = id_temporada;
    await entrenador.save();
    if (idsCategorias) {
      await entrenador.setCategorias(idsCategorias);
      const añadidas = idsCategorias.filter((id) => !idsCategoriasPrevias.includes(id));
      const quitadas = idsCategoriasPrevias.filter((id) => !idsCategorias.includes(id));
      if (añadidas.length) {
        await Categoria.update({ id_entrenador: entrenador.id }, { where: { id: añadidas } });
      }
      if (quitadas.length) {
        await Categoria.update({ id_entrenador: null }, { where: { id: quitadas, id_entrenador: entrenador.id } });
      }
    }
    if (idsTitulos) await entrenador.setTitulos(idsTitulos);
    const actualizado = await Entrenador.findOne({ where: { id: entrenador.id }, include: includeEntrenador });
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