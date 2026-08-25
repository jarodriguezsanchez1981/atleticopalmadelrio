const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Delegado = sequelize.define('Delegado', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  apellidos: { type: DataTypes.STRING(150), allowNull: false },
  dni: { type: DataTypes.STRING(15), allowNull: false, unique: true },
  foto: { type: DataTypes.TEXT('long'), allowNull: true },
  tipo: { type: DataTypes.ENUM('campo', 'equipo'), allowNull: false, defaultValue: 'campo' }
}, {
  tableName: 'delegados'
});

module.exports = Delegado;
