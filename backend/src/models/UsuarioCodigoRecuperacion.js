const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Códigos de recuperación de un solo uso del 2FA. Se guarda solo el hash
// bcrypt (como una contraseña); el texto plano se muestra una única vez al
// generarlos. `usado` marca el que ya se ha gastado.
const UsuarioCodigoRecuperacion = sequelize.define('UsuarioCodigoRecuperacion', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_usuario: { type: DataTypes.INTEGER, allowNull: false },
  codigo_hash: { type: DataTypes.STRING(255), allowNull: false },
  usado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'usuario_codigos_recuperacion',
  updatedAt: false,
  createdAt: false
});

module.exports = UsuarioCodigoRecuperacion;
