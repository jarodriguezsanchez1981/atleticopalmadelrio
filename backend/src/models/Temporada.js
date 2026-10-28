const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Temporada = sequelize.define('Temporada', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  actual: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, {
  tableName: 'temporadas'
});

module.exports = Temporada;
