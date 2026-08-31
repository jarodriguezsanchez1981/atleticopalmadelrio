const { Cambio, Usuario } = require('../models');

const includeUsuario = [
  { model: Usuario, as: 'usuario', attributes: ['id', 'usuario', 'nombre', 'apellidos'] }
];

async function listar(req, res, next) {
  try {
    const where = {};
    if (req.query.entidad) where.entidad = req.query.entidad;
    if (req.query.accion) where.accion = req.query.accion;
    if (req.query.id_usuario) where.id_usuario = req.query.id_usuario;

    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);
    const offset = parseInt(req.query.offset, 10) || 0;

    const cambios = await Cambio.findAll({
      where,
      include: includeUsuario,
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    res.json(cambios);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const cambio = await Cambio.findByPk(req.params.id, { include: includeUsuario });
    if (!cambio) return res.status(404).json({ message: 'Cambio no encontrado.' });
    res.json(cambio);
  } catch (err) { next(err); }
}

module.exports = { listar, obtener };
