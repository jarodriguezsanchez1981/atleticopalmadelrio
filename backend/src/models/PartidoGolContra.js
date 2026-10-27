const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/** Gol del equipo contrario en un partido, con el minuto y el tipo
 * (normal / penalti). Incluye los goles en propia puerta del PALMA (suman al
 * rival). No lleva id_jugador: el rival no está en la base de datos.
 * `titular`: si quien marca era titular o suplente (NULL si no se sabe);
 * `propia`: gol en propia puerta del PALMA (no es de un jugador del rival).
 * Ver Finalizar Acta, Estadísticas Goles (goles en contra por periodo) y
 * Estadísticas Rivales. */
const PartidoGolContra = sequelize.define('PartidoGolContra', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_partido: { type: DataTypes.INTEGER, allowNull: false },
  minuto: { type: DataTypes.INTEGER, allowNull: true },
  tipo: { type: DataTypes.ENUM('normal', 'penalti'), allowNull: false, defaultValue: 'normal' },
  titular: { type: DataTypes.BOOLEAN, allowNull: true },
  propia: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, {
  tableName: 'partido_goles_contra',
  timestamps: false
});

module.exports = PartidoGolContra;
