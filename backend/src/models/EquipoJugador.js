const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const EquipoJugador = sequelize.define('EquipoJugador', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_equipo: { type: DataTypes.INTEGER, allowNull: false },
  id_categoria: { type: DataTypes.INTEGER, allowNull: false },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  apellidos: { type: DataTypes.STRING(150), allowNull: false }
}, {
  tableName: 'equipos_jugadores',
  timestamps: false
});

module.exports = EquipoJugador;
