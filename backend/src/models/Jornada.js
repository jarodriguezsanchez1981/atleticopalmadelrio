const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Jornada = sequelize.define('Jornada', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_plantilla: { type: DataTypes.INTEGER, allowNull: false },
  id_equipo_local: { type: DataTypes.INTEGER, allowNull: false },
  id_equipo_visitante: { type: DataTypes.INTEGER, allowNull: false },
  jornada: { type: DataTypes.INTEGER, allowNull: false },
  fecha: { type: DataTypes.DATEONLY, allowNull: false },
  hora: { type: DataTypes.TIME, allowNull: true },
  incidencias: { type: DataTypes.TEXT, allowNull: true },
  observaciones: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'jornadas'
});

module.exports = Jornada;
