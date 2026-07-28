const MatchModel = require('../models/match.model');
const CategoryModel = require('../models/category.model');

async function listByRange(req, res) {
  const { from, to } = req.query;
  let ids = req.user.role === 'entrenador'
    ? req.user.categoryIds
    : (req.query.categoryIds ? req.query.categoryIds.split(',').map(Number) : []);

  if ((req.user.role === 'admin' || req.user.role === 'coordinador') && ids.length === 0) {
    ids = (await CategoryModel.listAll()).map((c) => c.id);
  }

  const matches = await MatchModel.listByRange(ids, from, to);
  res.json(matches);
}

async function create(req, res) {
  const id = await MatchModel.create({ ...req.body, createdBy: req.user.id });
  res.status(201).json({ id });
}

async function setResult(req, res) {
  const { resultOwn, resultRival } = req.body;
  await MatchModel.setResult(req.params.id, resultOwn, resultRival);
  res.json({ message: 'Resultado guardado.' });
}

async function getSquad(req, res) {
  const squad = await MatchModel.getSquad(req.params.id);
  res.json(squad);
}

async function updatePlayerEntry(req, res) {
  await MatchModel.updatePlayerEntry(req.params.id, req.params.playerId, req.body);
  res.json({ message: 'Convocatoria/estadistica actualizada.' });
}

async function remove(req, res) {
  await MatchModel.remove(req.params.id);
  res.json({ message: 'Partido eliminado.' });
}

async function playerStats(req, res) {
  const stats = await MatchModel.getPlayerSeasonStats(req.params.playerId);
  res.json(stats);
}

async function categoryStats(req, res) {
  const stats = await MatchModel.getCategorySeasonStats(req.params.categoryId);
  res.json(stats);
}

module.exports = {
  listByRange, create, setResult, getSquad,
  updatePlayerEntry, remove, playerStats, categoryStats,
};
