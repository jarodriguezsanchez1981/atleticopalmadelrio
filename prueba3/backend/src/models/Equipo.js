const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Equipo = sequelize.define('Equipo', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  escudo: { type: DataTypes.TEXT('long'), allowNull: true },
  direccion: { type: DataTypes.STRING(255), allowNull: true },
  codigopostal: { type: DataTypes.STRING(10), allowNull: true },
  localidad: { type: DataTypes.STRING(100), allowNull: true },
  provincia: { type: DataTypes.STRING(100), allowNull: true }
}, {
  tableName: 'equipos'
});

module.exports = Equipo;
