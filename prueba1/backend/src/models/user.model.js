const db = require('../config/db');

const UserModel = {
  findByEmail(email) {
    return db.prepare(
      `SELECT u.id, u.name, u.surname, u.email, u.password_hash, u.active,
              r.name AS role
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.email = ?`
    ).get(email) || null;
  },

  getAssignedCategoryIds(userId) {
    const rows = db.prepare(
      `SELECT category_id FROM user_categories WHERE user_id = ?`
    ).all(userId);
    return rows.map((r) => r.category_id);
  },

  create({ name, surname, email, passwordHash, roleName }) {
    const result = db.prepare(
      `INSERT INTO users (name, surname, email, password_hash, role_id)
       VALUES (?, ?, ?, ?, (SELECT id FROM roles WHERE name = ?))`
    ).run(name, surname, email, passwordHash, roleName);
    return result.lastInsertRowid;
  },

  assignCategories(userId, categoryIds = []) {
    if (categoryIds.length === 0) return;
    const insert = db.prepare(
      `INSERT OR IGNORE INTO user_categories (user_id, category_id) VALUES (?, ?)`
    );
    const insertMany = db.transaction((ids) => {
      for (const catId of ids) insert.run(userId, catId);
    });
    insertMany(categoryIds);
  },

  listAll() {
    return db.prepare(
      `SELECT u.id, u.name, u.surname, u.email, u.active, r.name AS role
       FROM users u JOIN roles r ON r.id = u.role_id
       ORDER BY u.name`
    ).all();
  },
};

module.exports = UserModel;
