const { PartidoJugador, Partido, Jugador, Categoria, Lugar, Equipo } = require('../models');

const includes = [
  {
    model: Partido,
    as: 'partido',
    attributes: ['id', 'fecha', 'id_categoria', 'id_lugar', 'id_equipo'],
    include: [
      { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
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

function normalizeNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

async function listar(req, res, next) {
  try {
    const { id_partido, id_jugador, id_categoria } = req.query;
    const where = {};
    if (id_partido) where.id_partido = id_partido;
    if (id_jugador) where.id_jugador = id_jugador;

    const include = [...includes];
    if (id_categoria) {
      include[0] = { ...include[0], where: { id_categoria } };
    }

    const registros = await PartidoJugador.findAll({
      where: Object.keys(where).length ? where : undefined,
      include,
      order: [['id', 'ASC']]
    });
    res.json(registros);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const registro = await PartidoJugador.findByPk(req.params.id, { include: includes });
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
    const creado = await PartidoJugador.create({
      id_partido,
      id_jugador,
      minutos: normalizeNumber(req.body.minutos, 0),
      goles: normalizeNumber(req.body.goles, 0),
      tarjeta_amarilla: normalizeNumber(req.body.tarjeta_amarilla, 0),
      tarjeta_roja: normalizeNumber(req.body.tarjeta_roja, 0),
      incidencias: req.body.incidencias || null
    });
    const completo = await PartidoJugador.findByPk(creado.id, { include: includes });
    res.status(201).json(completo);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const registro = await PartidoJugador.findByPk(req.params.id);
    if (!registro) return res.status(404).json({ message: 'Registro no encontrado.' });
    const { id_partido, id_jugador, incidencias } = req.body;
    if (id_partido !== undefined) registro.id_partido = id_partido;
    if (id_jugador !== undefined) registro.id_jugador = id_jugador;
    if (req.body.minutos !== undefined) registro.minutos = normalizeNumber(req.body.minutos, 0);
    if (req.body.goles !== undefined) registro.goles = normalizeNumber(req.body.goles, 0);
    if (req.body.tarjeta_amarilla !== undefined) registro.tarjeta_amarilla = normalizeNumber(req.body.tarjeta_amarilla, 0);
    if (req.body.tarjeta_roja !== undefined) registro.tarjeta_roja = normalizeNumber(req.body.tarjeta_roja, 0);
    if (incidencias !== undefined) registro.incidencias = incidencias || null;
    await registro.save();
    const actualizado = await PartidoJugador.findByPk(registro.id, { include: includes });
    res.json(actualizado);
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await PartidoJugador.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Registro no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };