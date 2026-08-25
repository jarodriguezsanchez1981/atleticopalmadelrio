const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Entrenamiento = sequelize.define('Entrenamiento', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_plantilla: { type: DataTypes.INTEGER, allowNull: false },
  fecha: { type: DataTypes.DATE, allowNull: false },
  hasta: { type: DataTypes.DATE, allowNull: true },
  id_lugar: { type: DataTypes.INTEGER, allowNull: false },
  id_usuario: { type: DataTypes.INTEGER, allowNull: true },
  recurrente: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, {
  tableName: 'entrenamientos'
});

module.exports = Entrenamiento;
