const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Partido = sequelize.define('Partido', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_plantilla: { type: DataTypes.INTEGER, allowNull: false },
  fecha: { type: DataTypes.DATE, allowNull: false },
  id_lugar: { type: DataTypes.INTEGER, allowNull: true },
  id_equipo: { type: DataTypes.INTEGER, allowNull: false },
  es_local: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  id_usuario: { type: DataTypes.INTEGER, allowNull: true },
  incidencias: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'partidos'
});

module.exports = Partido;
