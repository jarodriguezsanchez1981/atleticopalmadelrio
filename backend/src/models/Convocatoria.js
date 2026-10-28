const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Convocatoria = sequelize.define('Convocatoria', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_temporada: { type: DataTypes.INTEGER, allowNull: false },
  id_plantilla: { type: DataTypes.INTEGER, allowNull: false },
  id_partido: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'convocatorias'
});

module.exports = Convocatoria;
