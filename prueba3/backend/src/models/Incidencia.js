const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Incidencia = sequelize.define('Incidencia', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_categoria: { type: DataTypes.INTEGER, allowNull: true },
  id_jugador: { type: DataTypes.INTEGER, allowNull: true },
  id_entrenador: { type: DataTypes.INTEGER, allowNull: true },
  id_delegado: { type: DataTypes.INTEGER, allowNull: true },
  id_usuario: { type: DataTypes.INTEGER, allowNull: true },
  incidencias: { type: DataTypes.TEXT, allowNull: true },
  fecha: { type: DataTypes.DATE, allowNull: false }
}, {
  tableName: 'incidencias'
});

module.exports = Incidencia;