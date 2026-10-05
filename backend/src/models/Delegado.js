const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const { camposDniCifrado, ocultarDniCifrado } = require('../utils/dniCrypto.mixin');

const Delegado = sequelize.define('Delegado', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  apellidos: { type: DataTypes.STRING(150), allowNull: false },
  ...camposDniCifrado(),
  email: { type: DataTypes.STRING(150), allowNull: true },
  foto: { type: DataTypes.TEXT('long'), allowNull: true },
  telefono: { type: DataTypes.STRING(20), allowNull: true },
  tipo: { type: DataTypes.ENUM('campo', 'equipo'), allowNull: false, defaultValue: 'campo' }
}, {
  tableName: 'delegados'
});

ocultarDniCifrado(Delegado);

module.exports = Delegado;
