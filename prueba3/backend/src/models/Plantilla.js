const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Plantilla = sequelize.define('Plantilla', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_categoria: { type: DataTypes.INTEGER, allowNull: false },
  id_jugador: { type: DataTypes.INTEGER, allowNull: true },
  id_entrenador: { type: DataTypes.INTEGER, allowNull: true },
  id_delegado: { type: DataTypes.INTEGER, allowNull: true },
  id_division: { type: DataTypes.INTEGER, allowNull: true },
  id_temporada: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'plantillas',
  timestamps: false
});

module.exports = Plantilla;
