const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Equipo = sequelize.define('Equipo', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false, primaryKey: true, unique: true }
}, {
  tableName: 'equipos'
});

module.exports = Equipo;
