const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Lugar = sequelize.define('Lugar', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(150), allowNull: false, unique: true }
}, {
  tableName: 'lugares'
});

module.exports = Lugar;
