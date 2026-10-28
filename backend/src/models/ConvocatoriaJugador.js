const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ConvocatoriaJugador = sequelize.define('ConvocatoriaJugador', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_convocatoria: { type: DataTypes.INTEGER, allowNull: false },
  id_jugador: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'convocatorias_jugadores'
});

module.exports = ConvocatoriaJugador;
