const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const entero = { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 };

/** Clasificación de la liga en una jornada, una fila por equipo (copiada de
 * RFAF, ver controllers/clasificacion.controller.js). */
const Clasificacion = sequelize.define('Clasificacion', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_plantilla: { type: DataTypes.INTEGER, allowNull: false },
  jornada: { type: DataTypes.INTEGER, allowNull: false },
  fecha: { type: DataTypes.DATEONLY, allowNull: true },
  posicion: { type: DataTypes.INTEGER, allowNull: false },
  equipo: { type: DataTypes.STRING(150), allowNull: false },
  codigo_equipo: { type: DataTypes.STRING(20), allowNull: true },
  es_palma: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  puntos: entero,
  jugados: entero,
  ganados: entero,
  empatados: entero,
  perdidos: entero,
  jugados_casa: entero,
  ganados_casa: entero,
  empatados_casa: entero,
  perdidos_casa: entero,
  jugados_fuera: entero,
  ganados_fuera: entero,
  empatados_fuera: entero,
  perdidos_fuera: entero,
  goles_favor: entero,
  goles_contra: entero,
  puntos_sancion: entero
}, {
  tableName: 'clasificaciones'
});

module.exports = Clasificacion;
