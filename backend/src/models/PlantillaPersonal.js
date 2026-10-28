const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PlantillaPersonal = sequelize.define('PlantillaPersonal', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_plantilla: { type: DataTypes.INTEGER, allowNull: false },
  id_personal: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'plantilla_personal',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['id_plantilla', 'id_personal'] }
  ]
});

module.exports = PlantillaPersonal;
