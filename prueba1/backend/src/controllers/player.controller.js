const PlayerModel = require('../models/player.model');

async function listByCategory(req, res) {
  const players = await PlayerModel.listByCategory(req.params.categoryId);
  res.json(players);
}

async function getOne(req, res) {
  const player = await PlayerModel.findById(req.params.id);
  if (!player) return res.status(404).json({ message: 'Jugador no encontrado.' });
  res.json(player);
}

async function create(req, res) {
  const id = await PlayerModel.create(req.body);
  res.status(201).json({ id });
}

async function update(req, res) {
  await PlayerModel.update(req.params.id, req.body);
  res.json({ message: 'Jugador actualizado.' });
}

async function remove(req, res) {
  await PlayerModel.deactivate(req.params.id);
  res.json({ message: 'Jugador dado de baja.' });
}

module.exports = { listByCategory, getOne, create, update, remove };
