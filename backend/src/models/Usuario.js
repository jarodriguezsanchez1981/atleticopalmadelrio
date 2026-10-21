const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Usuario = sequelize.define('Usuario', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  usuario: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  // Hash bcrypt, nunca texto plano
  password: { type: DataTypes.STRING(255), allowNull: false },
  // Secreto TOTP (2FA) cifrado con AES (aesCrypto); NULL si no está configurado.
  totp_secret: { type: DataTypes.STRING(255), allowNull: true },
  // Si el usuario ya completó el enrolamiento del segundo factor.
  totp_activado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  // Bloqueo temporal por intentos de contraseña fallidos (fuerza bruta).
  intentos_fallidos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  bloqueado_hasta: { type: DataTypes.DATE, allowNull: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  apellidos: { type: DataTypes.STRING(150), allowNull: false },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  rol: { type: DataTypes.ENUM('coordinador', 'entrenador'), allowNull: false, defaultValue: 'coordinador' },
  id_categoria: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'usuarios',
  defaultScope: {
    // Ni el hash de la contraseña ni el secreto TOTP salen por defecto.
    attributes: { exclude: ['password', 'totp_secret'] }
  },
  scopes: {
    // Incluye todo (password y totp_secret): solo para login/verificación 2FA.
    withPassword: { attributes: {} }
  }
});

module.exports = Usuario;
