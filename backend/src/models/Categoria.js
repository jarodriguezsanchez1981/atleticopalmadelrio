const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Categoria = sequelize.define('Categoria', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  alias: { type: DataTypes.STRING(100), allowNull: true },
  id_tipofutbol: { type: DataTypes.INTEGER, allowNull: false },
  id_entrenador: { type: DataTypes.INTEGER, allowNull: true },
  tiempopartido: { type: DataTypes.INTEGER, allowNull: true },
  tiempoentrenamiento: { type: DataTypes.INTEGER, allowNull: true },
  orden: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'categorias'
});

module.exports = Categoria;
