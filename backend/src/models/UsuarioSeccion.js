const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const UsuarioSeccion = sequelize.define('usuario_secciones', {
  id_usuario: { type: DataTypes.INTEGER, primaryKey: true },
  id_seccion: { type: DataTypes.INTEGER, primaryKey: true },
  puede_ver: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  puede_editar: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, {
  tableName: 'usuario_secciones',
  timestamps: false
});

module.exports = UsuarioSeccion;
