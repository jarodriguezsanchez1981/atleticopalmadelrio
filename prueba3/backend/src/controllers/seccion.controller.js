const { Seccion } = require('../models');

async function listar(req, res, next) {
  try {
    const secciones = await Seccion.findAll({ order: [['orden', 'ASC'], ['id', 'ASC']] });
    res.json(secciones);
  } catch (err) { next(err); }
}

module.exports = { listar };
