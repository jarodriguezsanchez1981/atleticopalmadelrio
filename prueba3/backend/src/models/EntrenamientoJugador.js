const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const EntrenamientoJugador = sequelize.define('EntrenamientoJugador', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_entrenamiento: { type: DataTypes.INTEGER, allowNull: false },
  id_jugador: { type: DataTypes.INTEGER, allowNull: false },
  incidencias: { type: DataTypes.TEXT, allowNull: true },
  asistencia: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
  tableName: 'entrenamientos_jugadores'
});

module.exports = EntrenamientoJugador;