const { Incidencia, Jugador, Entrenador, Delegado, Categoria, Temporada, Usuario } = require('../models');

const includes = [
  {
    model: Categoria,
    as: 'categoria',
    attributes: ['id', 'nombre', 'id_temporada'],
    include: [{ model: Temporada, as: 'temporada', attributes: ['id', 'nombre'] }]
  },
  { model: Jugador, as: 'jugador', attributes: ['id', 'nombre', 'apellidos', 'dni'] },
  { model: Entrenador, as: 'entrenador', attributes: ['id', 'nombre', 'apellidos', 'dni'] },
  { model: Delegado, as: 'delegado', attributes: ['id', 'nombre', 'apellidos', 'dni'] },
  { model: Usuario, as: 'usuario', attributes: ['id', 'usuario', 'nombre', 'apellidos'] }
];

function hasReferencia(body) {
  return body.id_categoria || body.id_jugador || body.id_entrenador || body.id_delegado;
}

async function listar(req, res, next) {
  try {
    const incidencias = await Incidencia.findAll({
      include: includes,
      order: [['fecha', 'ASC']]
    });
    res.json(incidencias);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const incidencia = await Incidencia.findByPk(req.params.id, { include: includes });
    if (!incidencia) return res.status(404).json({ message: 'Incidencia no encontrada.' });
    res.json(incidencia);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { id_categoria, id_jugador, id_entrenador, id_delegado, incidencias, fecha } = req.body;
    if (!fecha) return res.status(400).json({ message: 'La fecha es obligatoria.' });
    if (!hasReferencia(req.body)) {
      return res.status(400).json({ message: 'Debe indicarse al menos una categoría, jugador, entrenador o delegado.' });
    }
    const creada = await Incidencia.create({
      id_categoria: id_categoria || null,
      id_jugador: id_jugador || null,
      id_entrenador: id_entrenador || null,
      id_delegado: id_delegado || null,
      id_usuario: req.user?.id || null,
      incidencias: incidencias || null,
      fecha
    });
    const completa = await Incidencia.findByPk(creada.id, { include: includes });
    res.status(201).json(completa);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const incidencia = await Incidencia.findByPk(req.params.id);
    if (!incidencia) return res.status(404).json({ message: 'Incidencia no encontrada.' });
    const { id_categoria, id_jugador, id_entrenador, id_delegado, incidencias, fecha } = req.body;
    if (id_categoria !== undefined) incidencia.id_categoria = id_categoria || null;
    if (id_jugador !== undefined) incidencia.id_jugador = id_jugador || null;
    if (id_entrenador !== undefined) incidencia.id_entrenador = id_entrenador || null;
    if (id_delegado !== undefined) incidencia.id_delegado = id_delegado || null;
    if (incidencias !== undefined) incidencia.incidencias = incidencias || null;
    if (fecha !== undefined) incidencia.fecha = fecha;
    await incidencia.save();
    const actualizada = await Incidencia.findByPk(incidencia.id, { include: includes });
    res.json(actualizada);
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Incidencia.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Incidencia no encontrada.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };