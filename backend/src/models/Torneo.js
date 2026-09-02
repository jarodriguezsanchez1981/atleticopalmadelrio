const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Torneo = sequelize.define('Torneo', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_plantilla: { type: DataTypes.INTEGER, allowNull: false },
  id_equipo: { type: DataTypes.INTEGER, allowNull: false },
  fecha: { type: DataTypes.DATEONLY, allowNull: false },
  hora: { type: DataTypes.TIME, allowNull: true }
}, {
  tableName: 'torneo'
});

module.exports = Torneo;
