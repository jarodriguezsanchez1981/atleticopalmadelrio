const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/** Tarjeta de un jugador del equipo contrario en un partido, con el minuto, si
 * era titular o suplente y el marcador justo antes visto desde el rival
 * (goles_favor: los del rival). Sin datos personales: num_jugador es la
 * posición del jugador en el acta (para las dobles amarillas). Ver Finalizar
 * Acta y Estadísticas Rivales. */
const PartidoTarjetaContra = sequelize.define('PartidoTarjetaContra', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_partido: { type: DataTypes.INTEGER, allowNull: false },
  num_jugador: { type: DataTypes.INTEGER, allowNull: true },
  tipo: { type: DataTypes.ENUM('amarilla', 'roja'), allowNull: false },
  minuto: { type: DataTypes.INTEGER, allowNull: true },
  titular: { type: DataTypes.BOOLEAN, allowNull: true },
  goles_favor: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  goles_contra: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, {
  tableName: 'partido_tarjetas_contra',
  timestamps: false
});

module.exports = PartidoTarjetaContra;
