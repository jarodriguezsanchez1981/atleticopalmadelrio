const { Coordinador, TipoFutbol, Plantilla, Categoria } = require('../models');

const includes = [
  { model: TipoFutbol, as: 'tipofutbol', attributes: ['id', 'nombre'] }
];

async function validarTipoFutbol(id_tipofutbol) {
  if (!id_tipofutbol) return null;
  const existe = await TipoFutbol.findOne({ where: { id: id_tipofutbol } });
  if (!existe) return 'El tipo de fútbol indicado no existe.';
  return null;
}

/** Asigna el coordinador a todas las plantillas cuya categoría comparte su tipo de fútbol. */
async function asignarACoordinadorEnPlantillas(coordinador) {
  if (!coordinador.id_tipofutbol) return;
  const categorias = await Categoria.findAll({ where: { id_tipofutbol: coordinador.id_tipofutbol }, attributes: ['id'] });
  const idsCategorias = categorias.map((c) => c.id);
  if (!idsCategorias.length) return;
  await Plantilla.update(
    { id_coordinador: coordinador.id },
    { where: { id_categoria: idsCategorias } }
  );
}

async function listar(req, res, next) {
  try {
    const coordinadores = await Coordinador.findAll({ include: includes, order: [['apellidos', 'ASC']] });
    res.json(coordinadores);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const coordinador = await Coordinador.findOne({ where: { id: req.params.id }, include: includes });
    if (!coordinador) return res.status(404).json({ message: 'Coordinador no encontrado.' });
    res.json(coordinador);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre, apellidos, id_tipofutbol, email, telefono } = req.body;
    if (!nombre || !apellidos) {
      return res.status(400).json({ message: 'Nombre y apellidos son obligatorios.' });
    }
    const errorTipo = await validarTipoFutbol(id_tipofutbol);
    if (errorTipo) return res.status(400).json({ message: errorTipo });
    const coordinador = await Coordinador.create({
      nombre, apellidos, id_tipofutbol: id_tipofutbol || null, email: email || null, telefono: telefono || null
    });
    await asignarACoordinadorEnPlantillas(coordinador);
    const completo = await Coordinador.findOne({ where: { id: coordinador.id }, include: includes });
    res.status(201).json(completo);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const coordinador = await Coordinador.findOne({ where: { id: req.params.id } });
    if (!coordinador) return res.status(404).json({ message: 'Coordinador no encontrado.' });
    const { nombre, apellidos, id_tipofutbol, email, telefono } = req.body;
    if (id_tipofutbol !== undefined) {
      const errorTipo = await validarTipoFutbol(id_tipofutbol);
      if (errorTipo) return res.status(400).json({ message: errorTipo });
      coordinador.id_tipofutbol = id_tipofutbol || null;
    }
    if (nombre !== undefined) coordinador.nombre = nombre;
    if (apellidos !== undefined) coordinador.apellidos = apellidos;
    if (email !== undefined) coordinador.email = email || null;
    if (telefono !== undefined) coordinador.telefono = telefono || null;
    await coordinador.save();
    const actualizado = await Coordinador.findOne({ where: { id: coordinador.id }, include: includes });
    res.json(actualizado);
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Coordinador.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Coordinador no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
