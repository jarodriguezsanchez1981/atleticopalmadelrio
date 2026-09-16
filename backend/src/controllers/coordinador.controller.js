const { Coordinador, TipoFutbol, Plantilla, Categoria } = require('../models');

const includes = [
  { model: TipoFutbol, as: 'tiposFutbol', attributes: ['id', 'nombre'], through: { attributes: [] } }
];

function normalizeIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(Number).filter(Boolean))];
}

async function verificarTipos(ids) {
  if (!ids.length) return true;
  const contados = await TipoFutbol.count({ where: { id: ids } });
  return contados === ids.length;
}

function serialize(coordinador) {
  const json = coordinador.toJSON ? coordinador.toJSON() : coordinador;
  json.ids_tipos_futbol = (json.tiposFutbol || []).map((t) => t.id);
  return json;
}

/** Asigna el coordinador a todas las plantillas cuya categoría comparta alguno de sus tipos de fútbol. */
async function asignarACoordinadorEnPlantillas(coordinador, idsTipos) {
  if (!idsTipos.length) return;
  const categorias = await Categoria.findAll({ where: { id_tipofutbol: idsTipos }, attributes: ['id'] });
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
    res.json(coordinadores.map(serialize));
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const coordinador = await Coordinador.findOne({ where: { id: req.params.id }, include: includes });
    if (!coordinador) return res.status(404).json({ message: 'Coordinador no encontrado.' });
    res.json(serialize(coordinador));
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre, apellidos, email, telefono } = req.body;
    if (!nombre || !apellidos) {
      return res.status(400).json({ message: 'Nombre y apellidos son obligatorios.' });
    }
    const idsTipos = normalizeIds(req.body.ids_tipos_futbol);
    const ok = await verificarTipos(idsTipos);
    if (!ok) return res.status(400).json({ message: 'Algún tipo de fútbol indicado no existe.' });
    const coordinador = await Coordinador.create({
      nombre, apellidos, email: email || null, telefono: telefono || null
    });
    if (idsTipos.length) await coordinador.setTiposFutbol(idsTipos);
    await asignarACoordinadorEnPlantillas(coordinador, idsTipos);
    const completo = await Coordinador.findOne({ where: { id: coordinador.id }, include: includes });
    res.status(201).json(serialize(completo));
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const coordinador = await Coordinador.findOne({ where: { id: req.params.id } });
    if (!coordinador) return res.status(404).json({ message: 'Coordinador no encontrado.' });
    const { nombre, apellidos, email, telefono } = req.body;
    if (nombre !== undefined) coordinador.nombre = nombre;
    if (apellidos !== undefined) coordinador.apellidos = apellidos;
    if (email !== undefined) coordinador.email = email || null;
    if (telefono !== undefined) coordinador.telefono = telefono || null;
    await coordinador.save();
    if (req.body.ids_tipos_futbol !== undefined) {
      const idsTipos = normalizeIds(req.body.ids_tipos_futbol);
      const ok = await verificarTipos(idsTipos);
      if (!ok) return res.status(400).json({ message: 'Algún tipo de fútbol indicado no existe.' });
      await coordinador.setTiposFutbol(idsTipos);
      await asignarACoordinadorEnPlantillas(coordinador, idsTipos);
    }
    const actualizado = await Coordinador.findOne({ where: { id: coordinador.id }, include: includes });
    res.json(serialize(actualizado));
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
