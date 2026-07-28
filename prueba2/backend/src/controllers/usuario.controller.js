const { Usuario, Rol } = require('../models');
const { isPasswordValid, hashPassword } = require('../utils/password.utils');

async function listar(req, res, next) {
  try {
    const usuarios = await Usuario.findAll({
      include: [{ model: Rol, as: 'rol', attributes: ['id', 'nombre'] }],
      order: [['id', 'ASC']]
    });
    res.json(usuarios);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const usuario = await Usuario.findByPk(req.params.id, {
      include: [{ model: Rol, as: 'rol', attributes: ['id', 'nombre'] }]
    });
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado.' });
    res.json(usuario);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { usuario, password, nombre, apellidos, id_rol } = req.body;

    if (!usuario || !password || !nombre || !apellidos || !id_rol) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }
    if (!isPasswordValid(password)) {
      return res.status(400).json({
        message: 'La contraseña debe tener mínimo 8 caracteres e incluir mayúsculas, minúsculas, números y caracteres especiales.'
      });
    }

    const hash = await hashPassword(password);
    const nuevo = await Usuario.create({ usuario, password: hash, nombre, apellidos, id_rol });

    const { password: _omit, ...safe } = nuevo.toJSON();
    res.status(201).json(safe);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const usuario = await Usuario.scope('withPassword').findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado.' });

    const { nombre, apellidos, id_rol, activo, password } = req.body;

    if (password) {
      if (!isPasswordValid(password)) {
        return res.status(400).json({
          message: 'La contraseña debe tener mínimo 8 caracteres e incluir mayúsculas, minúsculas, números y caracteres especiales.'
        });
      }
      usuario.password = await hashPassword(password);
    }

    if (nombre !== undefined) usuario.nombre = nombre;
    if (apellidos !== undefined) usuario.apellidos = apellidos;
    if (id_rol !== undefined) usuario.id_rol = id_rol;
    if (activo !== undefined) usuario.activo = activo;

    await usuario.save();
    const { password: _omit, ...safe } = usuario.toJSON();
    res.json(safe);
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    // No permitir que un administrador se borre a sí mismo por error
    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ message: 'No puedes eliminar tu propio usuario.' });
    }
    const eliminado = await Usuario.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Usuario no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
