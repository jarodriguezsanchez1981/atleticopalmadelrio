const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/** Cada envío de un informe por email (Informes → Semanal / Sanciones, según
 * `tipo`), automático o manual.
 * `lunes`: fecha del lunes que identifica el fin de semana (viernes-domingo
 * anterior). Sirve de historial y para no enviar dos veces el mismo fin de
 * semana. */
const InformeSemanal = sequelize.define('InformeSemanal', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tipo: { type: DataTypes.ENUM('semanal', 'sanciones'), allowNull: false, defaultValue: 'semanal' },
  lunes: { type: DataTypes.DATEONLY, allowNull: false },
  automatico: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  correcto: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  error: { type: DataTypes.TEXT, allowNull: true },
  destinatarios: { type: DataTypes.STRING(500), allowNull: false },
  id_usuario: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'informes_semanales'
});

module.exports = InformeSemanal;
