const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/** Torneo de Fútbol 7 organizado por el club (sección Generar Torneo). Sus
 * categorías y equipos van en TorneoGeneradoCategoria / TorneoGeneradoEquipo;
 * los partidos no se guardan, los calcula el frontend (utils/generarTorneo.js). */
const TorneoGenerado = sequelize.define('TorneoGenerado', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(150), allowNull: false },
  fecha: { type: DataTypes.DATEONLY, allowNull: false },
  observaciones: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'torneos_generados'
});

module.exports = TorneoGenerado;
