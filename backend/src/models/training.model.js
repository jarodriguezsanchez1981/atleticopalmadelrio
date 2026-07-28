const db = require('../config/db');

const TrainingModel = {
  listByRange(categoryIds, from, to) {
    if (!categoryIds || categoryIds.length === 0) return [];
    const placeholders = categoryIds.map(() => '?').join(',');
    return db.prepare(
      `SELECT t.*, c.name AS category_name
       FROM trainings t JOIN categories c ON c.id = t.category_id
       WHERE t.category_id IN (${placeholders}) AND t.event_date BETWEEN ? AND ?
       ORDER BY t.event_date, t.start_time`
    ).all(...categoryIds, from, to);
  },

  create(data) {
    const result = db.prepare(
      `INSERT INTO trainings (category_id, event_date, start_time, end_time, location, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(data.categoryId, data.eventDate, data.startTime, data.endTime, data.location, data.notes, data.createdBy);
    const trainingId = result.lastInsertRowid;

    // Convoca automaticamente a toda la plantilla activa de la categoria
    db.prepare(
      `INSERT INTO training_attendance (training_id, player_id, status)
       SELECT ?, id, 'convocado' FROM players WHERE category_id = ? AND active = 1`
    ).run(trainingId, data.categoryId);

    return trainingId;
  },

  getAttendance(trainingId) {
    return db.prepare(
      `SELECT ta.id, ta.player_id, ta.status, ta.notes, p.dorsal, p.name, p.surname
       FROM training_attendance ta JOIN players p ON p.id = ta.player_id
       WHERE ta.training_id = ? ORDER BY p.dorsal`
    ).all(trainingId);
  },

  setAttendance(trainingId, playerId, status, notes, confirmedBy) {
    db.prepare(
      `UPDATE training_attendance
       SET status = ?, notes = ?, confirmed_by = ?, confirmed_at = CURRENT_TIMESTAMP
       WHERE training_id = ? AND player_id = ?`
    ).run(status, notes, confirmedBy, trainingId, playerId);
  },

  remove(id) {
    db.prepare(`DELETE FROM trainings WHERE id = ?`).run(id);
  },
};

module.exports = TrainingModel;
