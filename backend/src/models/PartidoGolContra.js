const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/** Gol del equipo contrario en un partido, con el minuto y el tipo
 * (normal / penalti). Incluye los goles en propia puerta del PALMA (suman al
 * rival). No lleva id_jugador: el rival no está en la base de datos.
 * Ver Finalizar Acta y Estadísticas Goles (goles en contra por periodo). */
const PartidoGolContra = sequelize.define('PartidoGolContra', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_partido: { type: DataTypes.INTEGER, allowNull: false },
  minuto: { type: DataTypes.INTEGER, allowNull: true },
  tipo: { type: DataTypes.ENUM('normal', 'penalti'), allowNull: false, defaultValue: 'normal' }
}, {
  tableName: 'partido_goles_contra',
  timestamps: false
});

module.exports = PartidoGolContra;
