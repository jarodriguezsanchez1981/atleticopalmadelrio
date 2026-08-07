const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PartidoJugador = sequelize.define('PartidoJugador', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_partido: { type: DataTypes.INTEGER, allowNull: false },
  id_jugador: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'partidos_jugadores'
});

module.exports = PartidoJugador;