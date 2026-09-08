const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Coordinador = sequelize.define('Coordinador', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  apellidos: { type: DataTypes.STRING(150), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: true },
  telefono: { type: DataTypes.STRING(20), allowNull: true }
}, {
  tableName: 'coordinadores'
});

module.exports = Coordinador;
