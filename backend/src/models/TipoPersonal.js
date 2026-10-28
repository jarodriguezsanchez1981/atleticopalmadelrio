const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/** Tipos de personal del club (Fisioterapia, Utillería, Prensa…): sección Tipo Personal. */
const TipoPersonal = sequelize.define('TipoPersonal', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false, unique: true }
}, {
  tableName: 'tipo_personal'
});

module.exports = TipoPersonal;
