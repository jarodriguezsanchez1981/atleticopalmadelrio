const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/** Jugador de otra plantilla promocionado en una convocatoria. */
const ConvocatoriaPromocion = sequelize.define('ConvocatoriaPromocion', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_convocatoria: { type: DataTypes.INTEGER, allowNull: false },
  id_plantilla: { type: DataTypes.INTEGER, allowNull: false },
  id_jugador: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'convocatorias_promociones'
});

module.exports = ConvocatoriaPromocion;
