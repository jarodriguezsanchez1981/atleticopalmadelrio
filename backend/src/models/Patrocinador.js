const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Patrocinador = sequelize.define('Patrocinador', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(150), allowNull: false },
  imagen: { type: DataTypes.TEXT('long'), allowNull: true },
  orden: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  tipo: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'oficial' }
}, {
  tableName: 'patrocinadores'
});

module.exports = Patrocinador;