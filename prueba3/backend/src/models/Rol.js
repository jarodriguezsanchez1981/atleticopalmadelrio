const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ROLES = {
  read: { nivel: 1, etiqueta: 'Solo lectura' },
  write: { nivel: 2, etiqueta: 'Edición y borrado' }
};

const Rol = sequelize.define('Rol', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_usuario: { type: DataTypes.INTEGER, allowNull: false },
  nombre: { type: DataTypes.ENUM('read', 'write'), allowNull: false }
}, {
  tableName: 'roles',
  timestamps: false,
  indexes: [
    { fields: ['id_usuario', 'nombre'], unique: true }
  ]
});

function nivelDeRoles(roles) {
  if (!Array.isArray(roles) || !roles.length) return 0;
  return Math.max(...roles.map((r) => ROLES[r]?.nivel || 0));
}

Rol.ROLES = ROLES;
Rol.nivelDeRoles = nivelDeRoles;

module.exports = Rol;
