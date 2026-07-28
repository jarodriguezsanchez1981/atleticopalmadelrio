const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Entrenamiento = sequelize.define('Entrenamiento', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_categoria: { type: DataTypes.INTEGER, allowNull: false },
  fecha: { type: DataTypes.DATE, allowNull: false },
  id_lugar: { type: DataTypes.INTEGER, allowNull: false },
  incidencias: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'entrenamientos'
});

module.exports = Entrenamiento;
