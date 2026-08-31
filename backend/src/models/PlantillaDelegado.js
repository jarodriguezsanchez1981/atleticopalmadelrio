const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PlantillaDelegado = sequelize.define('PlantillaDelegado', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_plantilla: { type: DataTypes.INTEGER, allowNull: false },
  id_delegado: { type: DataTypes.INTEGER, allowNull: false },
  rol: { type: DataTypes.STRING(50), allowNull: true, defaultValue: 'delegado' }
}, {
  tableName: 'plantilla_delegados',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['id_plantilla', 'id_delegado'] }
  ]
});

module.exports = PlantillaDelegado;