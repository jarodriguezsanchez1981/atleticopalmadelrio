const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Categoria = sequelize.define('Categoria', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  temporada: { type: DataTypes.STRING(20), allowNull: false }
}, {
  tableName: 'categorias'
});

module.exports = Categoria;
