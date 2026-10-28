const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/** Personal del club (fisio, utillero, prensa…): sección Personal. */
const Personal = sequelize.define('Personal', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  foto: { type: DataTypes.TEXT('long'), allowNull: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  apellidos: { type: DataTypes.STRING(150), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: true },
  telefono: { type: DataTypes.STRING(20), allowNull: true },
  // Tipo de personal (Fisioterapia, Utillería…): tabla tipo_personal.
  id_tipo_personal: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'personal'
});

module.exports = Personal;
