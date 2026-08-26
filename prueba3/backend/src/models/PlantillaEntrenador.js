const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PlantillaEntrenador = sequelize.define('PlantillaEntrenador', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_plantilla: { type: DataTypes.INTEGER, allowNull: false },
  id_entrenador: { type: DataTypes.INTEGER, allowNull: false },
  rol: { type: DataTypes.STRING(50), allowNull: true, defaultValue: 'principal' }
}, {
  tableName: 'plantilla_entrenadores',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['id_plantilla', 'id_entrenador'] }
  ]
});

module.exports = PlantillaEntrenador;