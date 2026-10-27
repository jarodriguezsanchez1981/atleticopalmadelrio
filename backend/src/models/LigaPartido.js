const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/** Partido de la liga de una plantilla (todos, no solo los del PALMA), con su
 * acta de RFAF. acta_at NULL = acta pendiente de descargar. Ver
 * controllers/liga.controller.js. */
const LigaPartido = sequelize.define('LigaPartido', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_plantilla: { type: DataTypes.INTEGER, allowNull: false },
  jornada: { type: DataTypes.INTEGER, allowNull: false },
  codigo_acta: { type: DataTypes.STRING(20), allowNull: false },
  fecha: { type: DataTypes.DATEONLY, allowNull: true },
  hora: { type: DataTypes.STRING(5), allowNull: true },
  equipo_local: { type: DataTypes.STRING(150), allowNull: false },
  codigo_equipo_local: { type: DataTypes.STRING(20), allowNull: true },
  equipo_visitante: { type: DataTypes.STRING(150), allowNull: false },
  codigo_equipo_visitante: { type: DataTypes.STRING(20), allowNull: true },
  goles_local: { type: DataTypes.INTEGER, allowNull: true },
  goles_visitante: { type: DataTypes.INTEGER, allowNull: true },
  acta_at: { type: DataTypes.DATE, allowNull: true },
  intentos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, {
  tableName: 'liga_partidos',
  timestamps: false
});

module.exports = LigaPartido;
