const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Material = sequelize.define('Material', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false, unique: true }
}, {
  tableName: 'material'
});

module.exports = Material;
