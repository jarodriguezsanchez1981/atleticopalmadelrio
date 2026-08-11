const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PartidoJugador = sequelize.define('PartidoJugador', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_partido: { type: DataTypes.INTEGER, allowNull: false },
  id_jugador: { type: DataTypes.INTEGER, allowNull: false },
  minutos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  goles: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  tarjeta_amarilla: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  tarjeta_roja: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  incidencias: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'partidos_jugadores'
});

module.exports = PartidoJugador;