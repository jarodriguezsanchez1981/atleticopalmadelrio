const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PlantillaJugador = sequelize.define('PlantillaJugador', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_plantilla: { type: DataTypes.INTEGER, allowNull: false },
  id_jugador: { type: DataTypes.INTEGER, allowNull: false },
  dorsal: { type: DataTypes.INTEGER, allowNull: true },
  talla: { type: DataTypes.STRING(10), allowNull: true },
  titular: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, {
  tableName: 'plantilla_jugadores',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['id_plantilla', 'id_jugador'] }
  ]
});

module.exports = PlantillaJugador;