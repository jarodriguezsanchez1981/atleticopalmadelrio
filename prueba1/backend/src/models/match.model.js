const db = require('../config/db');

// SQLite no acepta booleans de JS como parametro; conviene normalizar a 0/1
const toInt = (v) => (v ? 1 : 0);

const MatchModel = {
  listByRange(categoryIds, from, to) {
    if (!categoryIds || categoryIds.length === 0) return [];
    const placeholders = categoryIds.map(() => '?').join(',');
    return db.prepare(
      `SELECT m.*, c.name AS category_name
       FROM matches m JOIN categories c ON c.id = m.category_id
       WHERE m.category_id IN (${placeholders}) AND m.event_date BETWEEN ? AND ?
       ORDER BY m.event_date, m.start_time`
    ).all(...categoryIds, from, to);
  },

  create(data) {
    const result = db.prepare(
      `INSERT INTO matches
        (category_id, event_date, start_time, location, rival, home_away, competition, jornada, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      data.categoryId, data.eventDate, data.startTime, data.location, data.rival,
      data.homeAway, data.competition, data.jornada, data.notes, data.createdBy
    );
    const matchId = result.lastInsertRowid;

    // Convocatoria inicial: se marca a toda la plantilla como "convocado" (editable despues)
    db.prepare(
      `INSERT INTO match_attendance (match_id, player_id, convocado, status)
       SELECT ?, id, 1, 'convocado' FROM players WHERE category_id = ? AND active = 1`
    ).run(matchId, data.categoryId);

    return matchId;
  },

  setResult(matchId, resultOwn, resultRival) {
    db.prepare(
      `UPDATE matches SET result_own = ?, result_rival = ? WHERE id = ?`
    ).run(resultOwn, resultRival, matchId);
  },

  getSquad(matchId) {
    return db.prepare(
      `SELECT ma.*, p.dorsal, p.name, p.surname
       FROM match_attendance ma JOIN players p ON p.id = ma.player_id
       WHERE ma.match_id = ? ORDER BY p.dorsal`
    ).all(matchId);
  },

  updatePlayerEntry(matchId, playerId, data) {
    db.prepare(
      `UPDATE match_attendance SET
        convocado = ?, status = ?, titular = ?, minutes_played = ?,
        goals = ?, yellow_cards = ?, red_card = ?, notes = ?
       WHERE match_id = ? AND player_id = ?`
    ).run(
      toInt(data.convocado), data.status, toInt(data.titular), data.minutesPlayed,
      data.goals, data.yellowCards, toInt(data.redCard), data.notes,
      matchId, playerId
    );
  },

  remove(id) {
    db.prepare(`DELETE FROM matches WHERE id = ?`).run(id);
  },

  /** Estadisticas globales de un jugador durante la temporada activa */
  getPlayerSeasonStats(playerId) {
    return db.prepare(
      `SELECT
         COUNT(*)                    AS partidos_convocado,
         SUM(titular)                AS partidos_titular,
         SUM(minutes_played)         AS minutos_totales,
         SUM(goals)                  AS goles,
         SUM(yellow_cards)           AS amarillas,
         SUM(red_card)               AS rojas
       FROM match_attendance
       WHERE player_id = ?`
    ).get(playerId);
  },

  /** Estadisticas globales por categoria (vista del coordinador) */
  getCategorySeasonStats(categoryId) {
    return db.prepare(
      `SELECT p.id AS player_id, p.dorsal, p.name, p.surname,
              COUNT(ma.id)                AS partidos_convocado,
              SUM(ma.titular)              AS partidos_titular,
              SUM(ma.minutes_played)       AS minutos_totales,
              SUM(ma.goals)                AS goles,
              SUM(ma.yellow_cards)         AS amarillas,
              SUM(ma.red_card)             AS rojas
       FROM players p
       LEFT JOIN match_attendance ma ON ma.player_id = p.id
       WHERE p.category_id = ? AND p.active = 1
       GROUP BY p.id
       ORDER BY goles DESC`
    ).all(categoryId);
  },
};

module.exports = MatchModel;
