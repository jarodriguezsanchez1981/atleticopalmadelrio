const { TipoPersonal, Personal } = require('../models');

async function listar(req, res, next) {
  try {
    const tipos = await TipoPersonal.findAll({ order: [['nombre', 'ASC']] });
    res.json(tipos);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const tipo = await TipoPersonal.findOne({ where: { id: req.params.id } });
    if (!tipo) return res.status(404).json({ message: 'Tipo de personal no encontrado.' });
    res.json(tipo);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const nombre = String(req.body.nombre ?? '').trim();
    if (!nombre) return res.status(400).json({ message: 'El nombre es obligatorio.' });
    if (await TipoPersonal.findOne({ where: { nombre } })) return res.status(409).json({ message: 'Ya existe un tipo de personal con ese nombre.' });
    const tipo = await TipoPersonal.create({ nombre });
    res.status(201).json(tipo);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const tipo = await TipoPersonal.findOne({ where: { id: req.params.id } });
    if (!tipo) return res.status(404).json({ message: 'Tipo de personal no encontrado.' });
    if (req.body.nombre !== undefined) {
      const nombre = String(req.body.nombre ?? '').trim();
      if (!nombre) return res.status(400).json({ message: 'El nombre es obligatorio.' });
      const otro = await TipoPersonal.findOne({ where: { nombre } });
      if (otro && Number(otro.id) !== Number(tipo.id)) return res.status(409).json({ message: 'Ya existe un tipo de personal con ese nombre.' });
      tipo.nombre = nombre;
    }
    await tipo.save();
    res.json(tipo);
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    // La FK no deja borrar un tipo en uso: se avisa antes con un mensaje claro.
    const enUso = await Personal.count({ where: { id_tipo_personal: req.params.id } });
    if (enUso) return res.status(409).json({ message: `No se puede eliminar: lo tiene${enUso === 1 ? '' : 'n'} ${enUso} persona${enUso === 1 ? '' : 's'} del personal.` });
    const eliminado = await TipoPersonal.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Tipo de personal no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
