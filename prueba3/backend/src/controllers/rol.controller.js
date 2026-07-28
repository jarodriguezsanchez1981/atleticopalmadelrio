const { Rol } = require('../models');

// Los 3 roles del club son fijos (administrador, coordinador, entrenador).
// Se expone un listado para poblar el <select> del formulario de usuarios;
// no se permite crear/eliminar roles libremente desde la UI para evitar
// romper la lógica de permisos, pero se deja el CRUD completo por si el
// club decide ampliar el catálogo en el futuro.

async function listar(req, res, next) {
  try {
    const roles = await Rol.findAll({ order: [['id', 'ASC']] });
    res.json(roles);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ message: 'El nombre del rol es obligatorio.' });
    const rol = await Rol.create({ nombre });
    res.status(201).json(rol);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const rol = await Rol.findByPk(req.params.id);
    if (!rol) return res.status(404).json({ message: 'Rol no encontrado.' });
    rol.nombre = req.body.nombre ?? rol.nombre;
    await rol.save();
    res.json(rol);
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Rol.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Rol no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, crear, actualizar, eliminar };
