const { Sancion, Partido, Jugador, Categoria, Equipo, Lugar } = require('../models');

const includes = [
  {
    model: Partido,
    as: 'partido',
    attributes: ['id', 'fecha', 'id_lugar', 'id_equipo', 'es_local'],
    include: [
      { model: Lugar, as: 'lugar', attributes: ['id', 'nombre'] },
      { model: Equipo, as: 'equipo', attributes: ['id', 'nombre'] }
    ]
  },
  {
    model: Jugador,
    as: 'jugador',
    attributes: ['id', 'nombre', 'apellidos']
  }
];

async function listar(req, res, next) {
  try {
    const { id_partido, id_jugador } = req.query;
    const where = {};
    if (id_partido) where.id_partido = id_partido;
    if (id_jugador) where.id_jugador = id_jugador;
    const registros = await Sancion.findAll({
      where: Object.keys(where).length ? where : undefined,
      include: includes,
      order: [['id', 'ASC']]
    });
    res.json(registros);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const registro = await Sancion.findByPk(req.params.id, { include: includes });
    if (!registro) return res.status(404).json({ message: 'Registro no encontrado.' });
    res.json(registro);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { id_partido, id_jugador } = req.body;
    if (!id_partido || !id_jugador) {
      return res.status(400).json({ message: 'El partido y el jugador son obligatorios.' });
    }
    const creado = await Sancion.create({
      id_partido,
      id_jugador,
      amarilla: Number(req.body.amarilla) || 0,
      roja: Number(req.body.roja) || 0
    });
    const completo = await Sancion.findByPk(creado.id, { include: includes });
    res.status(201).json(completo);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const registro = await Sancion.findByPk(req.params.id);
    if (!registro) return res.status(404).json({ message: 'Registro no encontrado.' });
    if (req.body.id_partido !== undefined) registro.id_partido = req.body.id_partido;
    if (req.body.id_jugador !== undefined) registro.id_jugador = req.body.id_jugador;
    if (req.body.amarilla !== undefined) registro.amarilla = Number(req.body.amarilla) || 0;
    if (req.body.roja !== undefined) registro.roja = Number(req.body.roja) || 0;
    await registro.save();
    const actualizado = await Sancion.findByPk(registro.id, { include: includes });
    res.json(actualizado);
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Sancion.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Registro no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
