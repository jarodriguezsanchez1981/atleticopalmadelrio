const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Cada ejecución de una tarea programada del backend (utils/tareasAutomaticas.js),
// para el panel de Tareas automáticas.
const TareaEjecucion = sequelize.define('TareaEjecucion', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tarea: { type: DataTypes.STRING(30), allowNull: false },
  inicio: { type: DataTypes.DATE, allowNull: false },
  fin: { type: DataTypes.DATE, allowNull: false },
  // ok | avisos | sesion (sesión de RFAF caducada) | error
  estado: { type: DataTypes.STRING(10), allowNull: false },
  resumen: { type: DataTypes.STRING(255), allowNull: true },
  detalle: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'tareas_ejecuciones',
  updatedAt: false,
  createdAt: false
});

module.exports = TareaEjecucion;
