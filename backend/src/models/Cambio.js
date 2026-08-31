const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Cambio = sequelize.define('Cambio', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  entidad: { type: DataTypes.STRING(50), allowNull: false },
  id_registro: { type: DataTypes.INTEGER, allowNull: true },
  accion: { type: DataTypes.ENUM('crear', 'editar', 'eliminar'), allowNull: false },
  datos_previos: { type: DataTypes.JSON, allowNull: true },
  datos_nuevos: { type: DataTypes.JSON, allowNull: true },
  id_usuario: { type: DataTypes.INTEGER, allowNull: true },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'cambios',
  updatedAt: false
});

module.exports = Cambio;
