const db = require('../config/db');

const PlayerModel = {
  listByCategory(categoryId) {
    return db.prepare(
      `SELECT * FROM players WHERE category_id = ? AND active = 1 ORDER BY dorsal`
    ).all(categoryId);
  },

  findById(id) {
    return db.prepare(`SELECT * FROM players WHERE id = ?`).get(id) || null;
  },

  create(data) {
    const result = db.prepare(
      `INSERT INTO players
        (category_id, dorsal, name, surname, birth_date, federative_license,
         license_status, physical_status, physical_notes, phone, email,
         contact_name, contact_phone, photo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      data.categoryId, data.dorsal, data.name, data.surname, data.birthDate,
      data.federativeLicense, data.licenseStatus || 'tramitando',
      data.physicalStatus || 'disponible', data.physicalNotes,
      data.phone, data.email, data.contactName, data.contactPhone, data.photoUrl
    );
    return result.lastInsertRowid;
  },

  update(id, data) {
    db.prepare(
      `UPDATE players SET
        dorsal = ?, name = ?, surname = ?, birth_date = ?, federative_license = ?,
        license_status = ?, physical_status = ?, physical_notes = ?,
        phone = ?, email = ?, contact_name = ?, contact_phone = ?, photo_url = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      data.dorsal, data.name, data.surname, data.birthDate, data.federativeLicense,
      data.licenseStatus, data.physicalStatus, data.physicalNotes,
      data.phone, data.email, data.contactName, data.contactPhone, data.photoUrl,
      id
    );
  },

  deactivate(id) {
    db.prepare(`UPDATE players SET active = 0 WHERE id = ?`).run(id);
  },
};

module.exports = PlayerModel;
