const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const { camposDniCifrado, ocultarDniCifrado } = require('../utils/dniCrypto.mixin');

const Jugador = sequelize.define('Jugador', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  apellidos: { type: DataTypes.STRING(150), allowNull: false },
  ...camposDniCifrado(),
  fecha_nacimiento: { type: DataTypes.DATEONLY, allowNull: true },
  foto: { type: DataTypes.TEXT('long'), allowNull: true },
  telefono: { type: DataTypes.STRING(20), allowNull: true }
}, {
  tableName: 'jugadores'
});

ocultarDniCifrado(Jugador);

module.exports = Jugador;
