const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/** Tarjeta de un partido de la liga con su minuto, si el jugador era titular y
 * el marcador justo antes visto desde su equipo (`lado`). */
const LigaTarjeta = sequelize.define('LigaTarjeta', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_liga_partido: { type: DataTypes.INTEGER, allowNull: false },
  lado: { type: DataTypes.ENUM('local', 'visitante'), allowNull: false },
  nombre: { type: DataTypes.STRING(150), allowNull: false },
  tipo: { type: DataTypes.ENUM('amarilla', 'roja'), allowNull: false },
  minuto: { type: DataTypes.INTEGER, allowNull: true },
  titular: { type: DataTypes.BOOLEAN, allowNull: true },
  goles_favor: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  goles_contra: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, {
  tableName: 'liga_tarjetas',
  timestamps: false
});

module.exports = LigaTarjeta;
