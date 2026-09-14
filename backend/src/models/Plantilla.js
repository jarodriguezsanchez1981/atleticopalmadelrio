const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Plantilla = sequelize.define('Plantilla', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_categoria: { type: DataTypes.INTEGER, allowNull: false },
  id_division: { type: DataTypes.INTEGER, allowNull: true },
  id_coordinador: { type: DataTypes.INTEGER, allowNull: true },
  id_temporada: { type: DataTypes.INTEGER, allowNull: false },
  codigo_competicion: { type: DataTypes.STRING(50), allowNull: true },
  codigo_grupo: { type: DataTypes.STRING(50), allowNull: true },
  codigo_temporada: { type: DataTypes.STRING(50), allowNull: true },
  codigo_equipo: { type: DataTypes.STRING(50), allowNull: true }
}, {
  tableName: 'plantillas',
  timestamps: false
});

module.exports = Plantilla;