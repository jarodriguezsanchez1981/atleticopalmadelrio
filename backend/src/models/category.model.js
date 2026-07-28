const db = require('../config/db');

const CategoryModel = {
  listAll() {
    return db.prepare(
      `SELECT c.id, c.name, c.description, s.name AS season, s.id AS season_id
       FROM categories c JOIN seasons s ON s.id = c.season_id
       ORDER BY s.is_active DESC, c.name`
    ).all();
  },

  listForUser(user) {
    if (user.role === 'admin' || user.role === 'coordinador') {
      return this.listAll();
    }
    return db.prepare(
      `SELECT c.id, c.name, c.description, s.name AS season
       FROM categories c
       JOIN seasons s ON s.id = c.season_id
       JOIN user_categories uc ON uc.category_id = c.id
       WHERE uc.user_id = ?
       ORDER BY c.name`
    ).all(user.id);
  },

  create({ seasonId, name, description }) {
    const result = db.prepare(
      `INSERT INTO categories (season_id, name, description) VALUES (?, ?, ?)`
    ).run(seasonId, name, description);
    return result.lastInsertRowid;
  },

  update(id, { name, description }) {
    db.prepare(
      `UPDATE categories SET name = ?, description = ? WHERE id = ?`
    ).run(name, description, id);
  },

  remove(id) {
    db.prepare(`DELETE FROM categories WHERE id = ?`).run(id);
  },
};

module.exports = CategoryModel;
