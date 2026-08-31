const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const EntrenamientoSemanal = sequelize.define('EntrenamientoSemanal', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_entrenamiento: { type: DataTypes.INTEGER, allowNull: false },
  fecha_entrenamiento: { type: DataTypes.DATE, allowNull: false },
  incidencias: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'entrenamientos_semanales'
});

module.exports = EntrenamientoSemanal;