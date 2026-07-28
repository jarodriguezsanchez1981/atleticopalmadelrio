const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Usuario = sequelize.define('Usuario', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  usuario: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  // Hash bcrypt, nunca texto plano
  password: { type: DataTypes.STRING(255), allowNull: false },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  apellidos: { type: DataTypes.STRING(150), allowNull: false },
  id_rol: { type: DataTypes.INTEGER, allowNull: false },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
  tableName: 'usuarios',
  defaultScope: {
    attributes: { exclude: ['password'] } // el hash nunca sale por defecto en las respuestas
  },
  scopes: {
    withPassword: { attributes: {} }
  }
});

module.exports = Usuario;
