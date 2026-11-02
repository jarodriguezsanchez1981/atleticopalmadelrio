const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/** Usuario elegido como destinatario del informe semanal (Informes → Semanal).
 * El email sale de su ficha de usuario. */
const InformeSemanalDestinatario = sequelize.define('InformeSemanalDestinatario', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_usuario: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'informe_semanal_destinatarios'
});

module.exports = InformeSemanalDestinatario;
