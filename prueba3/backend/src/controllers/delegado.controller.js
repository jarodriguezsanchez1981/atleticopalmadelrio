const { Delegado, Categoria, Temporada } = require('../models');
const { validarDNI } = require('../utils/dni.utils');

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
    const delegados = await Delegado.findAll({
      where: Object.keys(where).length ? where : undefined,
      include: includes,
      order: [['apellidos', 'ASC']]
    });
    res.json(delegados);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const delegado = await Delegado.findOne({ where: { id: req.params.id }, include: includes });
    if (!delegado) return res.status(404).json({ message: 'Delegado no encontrado.' });
    res.json(delegado);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre, apellidos, dni, foto, tipo, id_categoria, id_temporada } = req.body;
    if (!nombre || !apellidos || !dni || !id_temporada) {
      return res.status(400).json({ message: 'Nombre, apellidos, DNI y temporada son obligatorios.' });
    }
    if (!validarDNI(dni)) {
      return res.status(400).json({ message: 'El DNI introducido no es válido.' });
    }
    const delegado = await Delegado.create({ nombre, apellidos, dni, foto: foto || null, tipo: tipo || 'campo', id_categoria: id_categoria || null, id_temporada });
    if (delegado.id_categoria) {
      await Categoria.update({ id_delegado: delegado.id }, { where: { id: delegado.id_categoria } });
    }
    const creado = await Delegado.findOne({ where: { id: delegado.id }, include: includes });
    res.status(201).json(creado);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const delegado = await Delegado.findOne({ where: { id: req.params.id } });
    if (!delegado) return res.status(404).json({ message: 'Delegado no encontrado.' });
    const { nombre, apellidos, dni, foto, tipo, id_categoria, id_temporada } = req.body;
    const idCategoriaAnterior = delegado.id_categoria;
    if (nombre !== undefined) delegado.nombre = nombre;
    if (apellidos !== undefined) delegado.apellidos = apellidos;
    if (dni !== undefined) {
      if (!validarDNI(dni)) {
        return res.status(400).json({ message: 'El DNI introducido no es válido.' });
      }
      delegado.dni = dni;
    }
    if (foto !== undefined) delegado.foto = foto || null;
    if (tipo !== undefined) delegado.tipo = tipo;
    if (id_categoria !== undefined) delegado.id_categoria = id_categoria ? Number(id_categoria) : null;
    if (id_temporada !== undefined) delegado.id_temporada = id_temporada;
    await delegado.save();
    if (id_categoria !== undefined) {
      if (delegado.id_categoria && Number(delegado.id_categoria) !== Number(idCategoriaAnterior)) {
        await Categoria.update({ id_delegado: delegado.id }, { where: { id: delegado.id_categoria } });
      }
      if (idCategoriaAnterior && Number(idCategoriaAnterior) !== Number(delegado.id_categoria)) {
        await Categoria.update({ id_delegado: null }, { where: { id: idCategoriaAnterior, id_delegado: delegado.id } });
      }
    }
    const actualizado = await Delegado.findOne({ where: { id: delegado.id }, include: includes });
    res.json(actualizado);
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Delegado.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Delegado no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };