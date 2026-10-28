const { Seccion } = require('../models');

async function listar(req, res, next) {
  try {
    const secciones = await Seccion.findAll({ order: [['orden', 'ASC'], ['id', 'ASC']] });
    res.json(secciones);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const seccion = await Seccion.findByPk(req.params.id);
    if (!seccion) return res.status(404).json({ message: 'Sección no encontrada.' });
    const { nombre, icono, orden } = req.body;
    if (nombre !== undefined) seccion.nombre = nombre;
    if (icono !== undefined) seccion.icono = icono;
    if (orden !== undefined) seccion.orden = orden;
    await seccion.save();
    res.json(seccion);
  } catch (err) { next(err); }
}

async function reordenar(req, res, next) {
  try {
    const { orden } = req.body;
    if (!Array.isArray(orden)) {
      return res.status(400).json({ message: 'El cuerpo debe contener un array "orden".' });
    }
    for (const item of orden) {
      await Seccion.update({ orden: item.orden }, { where: { id: item.id } });
    }
    const secciones = await Seccion.findAll({ order: [['orden', 'ASC'], ['id', 'ASC']] });
    res.json(secciones);
  } catch (err) { next(err); }
}

module.exports = { listar, actualizar, reordenar };
