const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Entrenamientos → Videos. El fichero está en el disco (VIDEOS_DIR) con el
// nombre `fichero`; aquí solo sus datos.
const Video = sequelize.define('Video', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  titulo: { type: DataTypes.STRING(150), allowNull: false },
  descripcion: { type: DataTypes.TEXT, allowNull: true },
  // De dónde sale (p. ej. la tarea de alonbalon), para abrir el original.
  origen_url: { type: DataTypes.STRING(500), allowNull: true },
  fichero: { type: DataTypes.STRING(100), allowNull: true },
  fichero_nombre: { type: DataTypes.STRING, allowNull: true },
  fichero_tipo: { type: DataTypes.STRING(50), allowNull: true },
  fichero_tamano: { type: DataTypes.BIGINT, allowNull: true },
  id_usuario: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'videos'
});

module.exports = Video;
