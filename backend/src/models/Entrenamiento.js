const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Entrenamiento = sequelize.define('Entrenamiento', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_plantilla: { type: DataTypes.INTEGER, allowNull: false },
  fecha: { type: DataTypes.DATE, allowNull: false },
  hasta: { type: DataTypes.DATE, allowNull: true },
  id_lugar: { type: DataTypes.INTEGER, allowNull: false },
  id_usuario: { type: DataTypes.INTEGER, allowNull: true },
  recurrente: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  // Si está activo, no se comprueba el tiempo_entrenamiento de la categoría
  // para filtrar los lugares ocupados (la sesión real dura menos de lo habitual).
  horario_reducido: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  // Adjunto de la sesión (planificación): data URL en base64 (PDF o imagen) y
  // su nombre original. Es de esta sesión, no de la serie recurrente.
  adjunto: { type: DataTypes.TEXT('medium'), allowNull: true },
  adjunto_nombre: { type: DataTypes.STRING, allowNull: true }
}, {
  tableName: 'entrenamientos',
  // El base64 del adjunto no se trae en los listados ni en el detalle: pesa
  // mucho y solo lo necesita el endpoint que descarga el fichero.
  defaultScope: { attributes: { exclude: ['adjunto'] } },
  scopes: { conAdjunto: {} }
});

module.exports = Entrenamiento;
