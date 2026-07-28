const CategoryModel = require('../models/category.model');

async function list(req, res) {
  const categories = await CategoryModel.listForUser(req.user);
  res.json(categories);
}

async function create(req, res) {
  const { seasonId, name, description } = req.body;
  const id = await CategoryModel.create({ seasonId, name, description });
  res.status(201).json({ id });
}

async function update(req, res) {
  const { name, description } = req.body;
  await CategoryModel.update(req.params.id, { name, description });
  res.json({ message: 'Categoria actualizada.' });
}

async function remove(req, res) {
  await CategoryModel.remove(req.params.id);
  res.json({ message: 'Categoria eliminada.' });
}

module.exports = { list, create, update, remove };
