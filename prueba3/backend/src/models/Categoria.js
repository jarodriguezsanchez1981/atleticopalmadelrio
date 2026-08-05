const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Categoria = sequelize.define('Categoria', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  id_temporada: { type: DataTypes.INTEGER, allowNull: false },
  id_entrenador: { type: DataTypes.INTEGER, allowNull: true },
  id_delegado: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'categorias'
});

module.exports = Categoria;
