const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/** Una categoría de un torneo generado: es un torneo independiente con su
 * horario (hora_fin solo informativa), duración, campos y formato. */
const TorneoGeneradoCategoria = sequelize.define('TorneoGeneradoCategoria', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_torneo_generado: { type: DataTypes.INTEGER, allowNull: false },
  id_categoria: { type: DataTypes.INTEGER, allowNull: false },
  hora_inicio: { type: DataTypes.TIME, allowNull: false },
  hora_fin: { type: DataTypes.TIME, allowNull: true },
  duracion_min: { type: DataTypes.INTEGER, allowNull: false },
  descanso_min: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  campos: { type: DataTypes.JSON, allowNull: false },
  formato: { type: DataTypes.ENUM('liga', 'grupos'), allowNull: false },
  semifinales: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  final_oro: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  final_plata: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  // Sin descanso: un equipo puede jugar dos partidos seguidos.
  sin_descanso: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, {
  tableName: 'torneo_generado_categorias'
});

module.exports = TorneoGeneradoCategoria;
