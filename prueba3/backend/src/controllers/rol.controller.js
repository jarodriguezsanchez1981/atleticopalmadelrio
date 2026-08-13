const { Rol, Usuario } = require('../models');

const includeRol = [
  { model: Usuario, as: 'usuario', attributes: ['id', 'usuario', 'nombre', 'apellidos'] }
];

const NOMBRES_VALIDOS = ['read', 'write'];

function serialize(rol) {
  const json = rol.toJSON ? rol.toJSON() : rol;
  json.nivel = Rol.ROLES[json.nombre]?.nivel || 0;
  return json;
}

async function listar(req, res, next) {
  try {
    const roles = await Rol.findAll({
      include: includeRol,
      order: [['id', 'ASC']]
    });
    res.json(roles.map(serialize));
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const rol = await Rol.findByPk(req.params.id, { include: includeRol });
    if (!rol) return res.status(404).json({ message: 'Rol no encontrado.' });
    res.json(serialize(rol));
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { id_usuario, nombre } = req.body;
    if (!id_usuario || !nombre) {
      return res.status(400).json({ message: 'Usuario y rol son obligatorios.' });
    }
    if (!NOMBRES_VALIDOS.includes(nombre)) {
      return res.status(400).json({ message: 'El rol debe ser read o write.' });
    }
    const usuario = await Usuario.findByPk(id_usuario);
    if (!usuario) return res.status(400).json({ message: 'El usuario indicado no existe.' });

    const [rol] = await Rol.findOrCreate({
      where: { id_usuario, nombre }
    });
    const completo = await Rol.findByPk(rol.id, { include: includeRol });
    res.status(201).json(serialize(completo));
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const rol = await Rol.findByPk(req.params.id);
    if (!rol) return res.status(404).json({ message: 'Rol no encontrado.' });
    const { id_usuario, nombre } = req.body;
    if (id_usuario !== undefined) {
      const usuario = await Usuario.findByPk(id_usuario);
      if (!usuario) return res.status(400).json({ message: 'El usuario indicado no existe.' });
      rol.id_usuario = id_usuario;
    }
    if (nombre !== undefined) {
      if (!NOMBRES_VALIDOS.includes(nombre)) {
        return res.status(400).json({ message: 'El rol debe ser read o write.' });
      }
      rol.nombre = nombre;
    }
    await rol.save();
    const actualizado = await Rol.findByPk(rol.id, { include: includeRol });
    res.json(serialize(actualizado));
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Rol.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Rol no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
