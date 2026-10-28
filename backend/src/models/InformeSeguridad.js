const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Resumen de cada comprobación de parches de seguridad de Docker (el script
// comprobar-parches-docker.sh del EC2 inserta una fila por ejecución). La
// intranet lee la última para avisar a los administradores.
const InformeSeguridad = sequelize.define('InformeSeguridad', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  fecha: { type: DataTypes.DATE, allowNull: false },
  hay_actualizaciones: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  hay_vulnerabilidades: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  total_high: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  total_critical: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  resumen: { type: DataTypes.TEXT, allowNull: true },
  created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'informes_seguridad',
  updatedAt: false,
  createdAt: false
});

module.exports = InformeSeguridad;
