const { Resultado, Partido, Categoria, Equipo, Lugar } = require('../models');

const includes = [
  {
    model: Partido,
    as: 'partido',
    include: [
      { model: Categoria, as: 'categoria' },
      { model: Lugar, as: 'lugar', attributes: ['id', 'nombre'] },
      { model: Equipo, as: 'equipoLocal', attributes: ['id', 'nombre'] },
      { model: Equipo, as: 'equipoVisitante', attributes: ['id', 'nombre'] }
    ]
  }
];

async function listar(req, res, next) {
  try {
    const { id_partido } = req.query;
    const where = {};
    if (id_partido) where.id_partido = id_partido;
    const resultados = await Resultado.findAll({
      where: Object.keys(where).length ? where : undefined,
      include: includes,
      order: [['id', 'ASC']]
    });
    res.json(resultados);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const resultado = await Resultado.findByPk(req.params.id, { include: includes });
    if (!resultado) return res.status(404).json({ message: 'Resultado no encontrado.' });
    res.json(resultado);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { id_partido, resultado, incidencias } = req.body;
    if (!id_partido || !resultado) {
      return res.status(400).json({ message: 'El partido y el resultado son obligatorios.' });
    }
    const creado = await Resultado.create({ id_partido, resultado, incidencias: incidencias || null });
    const completo = await Resultado.findByPk(creado.id, { include: includes });
    res.status(201).json(completo);
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const resultado = await Resultado.findByPk(req.params.id);
    if (!resultado) return res.status(404).json({ message: 'Resultado no encontrado.' });
    const { id_partido, resultado: valor, incidencias } = req.body;
    if (id_partido !== undefined) resultado.id_partido = id_partido;
    if (valor !== undefined) resultado.resultado = valor;
    if (incidencias !== undefined) resultado.incidencias = incidencias || null;
    await resultado.save();
    const actualizado = await Resultado.findByPk(resultado.id, { include: includes });
    res.json(actualizado);
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Resultado.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Resultado no encontrado.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };