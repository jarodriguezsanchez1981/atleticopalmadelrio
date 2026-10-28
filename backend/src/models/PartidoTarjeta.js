const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/** Tarjeta de un jugador del PALMA en un partido, con el minuto y el marcador
 * justo antes (goles a favor / en contra del PALMA). Ver Finalizar Acta. */
const PartidoTarjeta = sequelize.define('PartidoTarjeta', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_partido: { type: DataTypes.INTEGER, allowNull: false },
  id_jugador: { type: DataTypes.INTEGER, allowNull: false },
  tipo: { type: DataTypes.ENUM('amarilla', 'roja'), allowNull: false },
  minuto: { type: DataTypes.INTEGER, allowNull: true },
  goles_favor: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  goles_contra: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, {
  tableName: 'partido_tarjetas',
  timestamps: false
});

module.exports = PartidoTarjeta;
