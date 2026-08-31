const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Titulo = sequelize.define('Titulo', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false, unique: true }
}, {
  tableName: 'titulo'
});

module.exports = Titulo;