const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PartidoJugador = sequelize.define('PartidoJugador', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_partido: { type: DataTypes.INTEGER, allowNull: false },
  id_jugador: { type: DataTypes.INTEGER, allowNull: true },
  id_equipo_jugador: { type: DataTypes.INTEGER, allowNull: true },
  es_local: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  tarjeta_amarilla: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  tarjeta_roja: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  goles: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  // Datos del acta de RFAF (Finalizar Acta); NULL si no vienen del acta.
  titular: { type: DataTypes.BOOLEAN, allowNull: true },
  minuto_entrada: { type: DataTypes.INTEGER, allowNull: true },
  minuto_salida: { type: DataTypes.INTEGER, allowNull: true },
  minutos: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'partido_jugadores',
  timestamps: false
});

module.exports = PartidoJugador;
