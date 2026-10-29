const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/** Inscripción de un equipo en una categoría de un torneo generado. Un mismo
 * equipo puede inscribirse varias veces con nombres distintos ("PALMA A",
 * "PALMA B"); grupo NULL en todos contra todos. */
const TorneoGeneradoEquipo = sequelize.define('TorneoGeneradoEquipo', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_torneo_generado_categoria: { type: DataTypes.INTEGER, allowNull: false },
  id_equipo: { type: DataTypes.INTEGER, allowNull: false },
  nombre: { type: DataTypes.STRING(150), allowNull: false },
  grupo: { type: DataTypes.ENUM('A', 'B'), allowNull: true },
  orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, {
  tableName: 'torneo_generado_equipos'
});

module.exports = TorneoGeneradoEquipo;
