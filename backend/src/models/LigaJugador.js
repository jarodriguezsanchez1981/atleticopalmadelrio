const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/** Jugador del acta de un partido de la liga (de cualquier equipo), con sus
 * minutos, goles y tarjetas. */
const LigaJugador = sequelize.define('LigaJugador', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_liga_partido: { type: DataTypes.INTEGER, allowNull: false },
  lado: { type: DataTypes.ENUM('local', 'visitante'), allowNull: false },
  dorsal: { type: DataTypes.INTEGER, allowNull: true },
  nombre: { type: DataTypes.STRING(150), allowNull: false },
  titular: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  minuto_entrada: { type: DataTypes.INTEGER, allowNull: true },
  minuto_salida: { type: DataTypes.INTEGER, allowNull: true },
  minutos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  goles: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  amarillas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  rojas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, {
  tableName: 'liga_jugadores',
  timestamps: false
});

module.exports = LigaJugador;
