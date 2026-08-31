const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Resultado = sequelize.define('Resultado', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_partido: { type: DataTypes.INTEGER, allowNull: false },
  resultado: { type: DataTypes.STRING(50), allowNull: false },
  incidencias: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'resultados'
});

module.exports = Resultado;