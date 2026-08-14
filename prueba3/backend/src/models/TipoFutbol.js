const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TipoFutbol = sequelize.define('TipoFutbol', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(50), allowNull: false, unique: true }
}, {
  tableName: 'tipofutbol',
  timestamps: false
});

module.exports = TipoFutbol;