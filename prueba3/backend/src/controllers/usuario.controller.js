const { Usuario, Seccion } = require('../models');
const { isPasswordValid, hashPassword } = require('../utils/password.utils');

const includeUsuario = [
  { model: Seccion, as: 'secciones', attributes: ['id', 'clave', 'nombre'], through: { attributes: [] } }
];

function normalizeSeccionesIds(body) {
  if (Array.isArray(body.ids_secciones)) return body.ids_secciones.map(Number).filter(Boolean);
  if (Array.isArray(body.secciones)) {
    return body.secciones.map((s) => (typeof s === 'object' ? Number(s.id) : Number(s))).filter(Boolean);
  }
  return null;
}

async function listar(req, res, next) {
  try {
    const usuarios = await Usuario.findAll({
      include: includeUsuario,
      order: [['id', 'ASC']]
    });
    res.json(usuarios.map((u) => serializeUsuario(u)));
  } catch (err) { next(err); }
}

function serializeUsuario(usuario) {
  const json = usuario.toJSON ? usuario.toJSON() : usuario;
  const { password, ...safe } = json;
  safe.ids_secciones = (safe.secciones || []).map((s) => s.id);
  return safe;
}

async function obtener(req, res, next) {
  try {
    const usuario = await Usuario.findByPk(req.params.id, { include: includeUsuario });
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado.' });
    res.json(serializeUsuario(usuario));
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { usuario, password, nombre, apellidos } = req.body;
    const idsSecciones = normalizeSeccionesIds(req.body) || [];

    if (!usuario || !password || !nombre || !apellidos) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }
    if (!idsSecciones.length) {
      return res.status(400).json({ message: 'Debes seleccionar al menos una sección visible.' });
    }
    if (!isPasswordValid(password)) {
      return res.status(400).json({
        message: 'La contraseña debe tener mínimo 8 caracteres e incluir mayúsculas, minúsculas, números y caracteres especiales.'
      });
    }

    const hash = await hashPassword(password);
    const nuevo = await Usuario.create({ usuario, password: hash, nombre, apellidos });
    await nuevo.setSecciones(idsSecciones);

    const completo = await Usuario.findByPk(nuevo.id, { include: includeUsuario });
    res.status(201).json(serializeUsuario(completo));
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const usuario = await Usuario.scope('withPassword').findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado.' });

    const { nombre, apellidos, activo, password } = req.body;
    const idsSecciones = normalizeSeccionesIds(req.body);

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
    if (activo !== undefined) usuario.activo = activo;

    await usuario.save();

    if (idsSecciones) {
      if (!idsSecciones.length) {
        return res.status(400).json({ message: 'Debes seleccionar al menos una sección visible.' });
      }
      await usuario.setSecciones(idsSecciones);
    }

    const completo = await Usuario.findByPk(usuario.id, { include: includeUsuario });
    res.json(serializeUsuario(completo));
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ message: 'No puedes eliminar tu propio usuario.' });
    }
    const eliminado = await Usuario.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Usuario no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
