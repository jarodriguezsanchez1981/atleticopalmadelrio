const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Posicion = sequelize.define('Posicion', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  alias: { type: DataTypes.STRING(50), allowNull: true }
}, {
  tableName: 'posicion'
});

module.exports = Posicion;
