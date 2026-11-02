const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/** Usuario elegido como destinatario de un informe por email (Informes →
 * Semanal / Sanciones, según `tipo`). El email sale de su ficha de usuario. */
const InformeSemanalDestinatario = sequelize.define('InformeSemanalDestinatario', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tipo: { type: DataTypes.ENUM('semanal', 'sanciones'), allowNull: false, defaultValue: 'semanal' },
  id_usuario: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'informe_semanal_destinatarios'
});

module.exports = InformeSemanalDestinatario;
