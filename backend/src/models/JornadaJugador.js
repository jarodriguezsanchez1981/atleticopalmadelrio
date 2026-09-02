const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const JornadaJugador = sequelize.define('JornadaJugador', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_jornada: { type: DataTypes.INTEGER, allowNull: false },
  id_jugador: { type: DataTypes.INTEGER, allowNull: true },
  id_equipo_jugador: { type: DataTypes.INTEGER, allowNull: true },
  es_local: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  tarjeta_amarilla: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  tarjeta_roja: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  goles: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, {
  tableName: 'jornada_jugadores',
  timestamps: false
});

module.exports = JornadaJugador;
