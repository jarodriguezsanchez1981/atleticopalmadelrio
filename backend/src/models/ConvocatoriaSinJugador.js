const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ConvocatoriaSinJugador = sequelize.define('ConvocatoriaSinJugador', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_convocatoria: { type: DataTypes.INTEGER, allowNull: false },
  id_plantilla: { type: DataTypes.INTEGER, allowNull: false },
  id_jugador: { type: DataTypes.INTEGER, allowNull: false },
  observaciones: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'convocatorias_sin_jugadores'
});

module.exports = ConvocatoriaSinJugador;
