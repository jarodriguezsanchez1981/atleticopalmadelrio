const { TipoFutbol } = require('../models');

async function listar(req, res, next) {
  try {
    const tipos = await TipoFutbol.findAll({ order: [['id', 'ASC']] });
    res.json(tipos);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const tipo = await TipoFutbol.findOne({ where: { id: req.params.id } });
    if (!tipo) return res.status(404).json({ message: 'Tipo de fútbol no encontrado.' });
    res.json(tipo);
  } catch (err) { next(err); }
}

module.exports = { listar, obtener };