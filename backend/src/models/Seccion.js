const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Seccion = sequelize.define('Seccion', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  clave: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  icono: { type: DataTypes.STRING(50), allowNull: true },
  orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, {
  tableName: 'secciones',
  timestamps: false
});

module.exports = Seccion;
