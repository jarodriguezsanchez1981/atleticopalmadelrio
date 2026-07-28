const TrainingModel = require('../models/training.model');

async function listByRange(req, res) {
  const { from, to } = req.query;
  const categoryIds = req.user.role === 'entrenador'
    ? req.user.categoryIds
    : (req.query.categoryIds ? req.query.categoryIds.split(',').map(Number) : []);

  // admin/coordinador sin filtro explicito -> todas las categorias existentes
  let ids = categoryIds;
  if ((req.user.role === 'admin' || req.user.role === 'coordinador') && ids.length === 0) {
    const CategoryModel = require('../models/category.model');
    ids = (await CategoryModel.listAll()).map((c) => c.id);
  }

  const trainings = await TrainingModel.listByRange(ids, from, to);
  res.json(trainings);
}

async function create(req, res) {
  const id = await TrainingModel.create({ ...req.body, createdBy: req.user.id });
  res.status(201).json({ id });
}

async function getAttendance(req, res) {
  const attendance = await TrainingModel.getAttendance(req.params.id);
  res.json(attendance);
}

async function setAttendance(req, res) {
  const { playerId, status, notes } = req.body;
  await TrainingModel.setAttendance(req.params.id, playerId, status, notes, req.user.id);
  res.json({ message: 'Asistencia actualizada.' });
}

async function remove(req, res) {
  await TrainingModel.remove(req.params.id);
  res.json({ message: 'Entrenamiento eliminado.' });
}

module.exports = { listByRange, create, getAttendance, setAttendance, remove };
