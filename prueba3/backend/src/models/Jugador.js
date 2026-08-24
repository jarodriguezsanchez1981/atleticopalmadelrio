const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Jugador = sequelize.define('Jugador', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  apellidos: { type: DataTypes.STRING(150), allowNull: false },
  dni: { type: DataTypes.STRING(15), allowNull: false, unique: true },
  fecha_nacimiento: { type: DataTypes.DATEONLY, allowNull: true },
  foto: { type: DataTypes.TEXT('long'), allowNull: true }
}, {
  tableName: 'jugadores'
});

module.exports = Jugador;
