const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/** Gol de un jugador del PALMA en un partido, con el minuto y el tipo
 * (normal / penalti). Ver Finalizar Acta. */
const PartidoGol = sequelize.define('PartidoGol', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_partido: { type: DataTypes.INTEGER, allowNull: false },
  id_jugador: { type: DataTypes.INTEGER, allowNull: false },
  minuto: { type: DataTypes.INTEGER, allowNull: true },
  tipo: { type: DataTypes.ENUM('normal', 'penalti'), allowNull: false, defaultValue: 'normal' }
}, {
  tableName: 'partido_goles',
  timestamps: false
});

module.exports = PartidoGol;
