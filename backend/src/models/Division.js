const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Division = sequelize.define('Division', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false, unique: true }
}, {
  tableName: 'division'
});

module.exports = Division;