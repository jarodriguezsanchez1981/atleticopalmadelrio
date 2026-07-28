const sequelize = require('../config/db');

const Rol = require('./Rol');
const Usuario = require('./Usuario');
const Categoria = require('./Categoria');
const Jugador = require('./Jugador');
const Entrenamiento = require('./Entrenamiento');
const Partido = require('./Partido');

// ---- Asociaciones ----
Rol.hasMany(Usuario, { foreignKey: 'id_rol' });
Usuario.belongsTo(Rol, { foreignKey: 'id_rol', as: 'rol' });

Categoria.hasMany(Jugador, { foreignKey: 'id_categoria' });
Jugador.belongsTo(Categoria, { foreignKey: 'id_categoria', as: 'categoria' });

Categoria.hasMany(Entrenamiento, { foreignKey: 'id_categoria' });
Entrenamiento.belongsTo(Categoria, { foreignKey: 'id_categoria', as: 'categoria' });

Categoria.hasMany(Partido, { foreignKey: 'id_categoria' });
Partido.belongsTo(Categoria, { foreignKey: 'id_categoria', as: 'categoria' });

module.exports = { sequelize, Rol, Usuario, Categoria, Jugador, Entrenamiento, Partido };
