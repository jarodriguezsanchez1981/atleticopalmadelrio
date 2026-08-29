const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Promocion = sequelize.define('Promocion', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_plantilla: { type: DataTypes.INTEGER, allowNull: false },
  id_categoria: { type: DataTypes.INTEGER, allowNull: false },
  id_jugador: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'promociones',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['id_plantilla', 'id_jugador'] }
  ]
});

module.exports = Promocion;
