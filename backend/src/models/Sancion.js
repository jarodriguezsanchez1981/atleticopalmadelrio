const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Sancion = sequelize.define('Sancion', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_partido: { type: DataTypes.INTEGER, allowNull: false },
  id_jugador: { type: DataTypes.INTEGER, allowNull: false },
  amarilla: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  roja: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, {
  tableName: 'sanciones'
});

module.exports = Sancion;
