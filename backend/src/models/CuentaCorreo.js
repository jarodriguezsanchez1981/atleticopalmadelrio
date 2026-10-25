const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Cuenta de correo interna de la web (configuración SMTP). La contraseña se
// guarda cifrada con AES (aesCrypto) y NUNCA sale por defecto en las consultas.
const CuentaCorreo = sequelize.define('CuentaCorreo', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  etiqueta: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false },
  smtp_host: { type: DataTypes.STRING(255), allowNull: false },
  smtp_port: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 587 },
  smtp_secure: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  smtp_user: { type: DataTypes.STRING(255), allowNull: false },
  // Contraseña SMTP cifrada (iv:tag:data en base64); NULL si no se ha puesto.
  smtp_password: { type: DataTypes.STRING(512), allowNull: true },
  // Solo una cuenta puede estar activa a la vez (es la que usa la web para enviar).
  activa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, {
  tableName: 'cuentas_correo',
  defaultScope: {
    // La contraseña cifrada nunca sale por defecto.
    attributes: { exclude: ['smtp_password'] }
  },
  scopes: {
    // Incluye la contraseña cifrada: solo para enviar correo (mailer).
    conPassword: { attributes: {} }
  }
});

module.exports = CuentaCorreo;
