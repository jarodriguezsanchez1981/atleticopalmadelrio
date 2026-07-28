const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Partido = sequelize.define('Partido', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_categoria: { type: DataTypes.INTEGER, allowNull: false },
  fecha: { type: DataTypes.DATE, allowNull: false },
  lugar: { type: DataTypes.STRING(150), allowNull: false },
  equipo_rival: { type: DataTypes.STRING(150), allowNull: false },
  resultado: { type: DataTypes.STRING(20), allowNull: true },
  incidencias: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'partidos'
});

module.exports = Partido;
