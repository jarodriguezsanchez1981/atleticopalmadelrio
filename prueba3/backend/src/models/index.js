const sequelize = require('../config/db');

const Rol = require('./Rol');
const Usuario = require('./Usuario');
const Seccion = require('./Seccion');
const Temporada = require('./Temporada');
const Lugar = require('./Lugar');
const Categoria = require('./Categoria');
const Jugador = require('./Jugador');
const Entrenador = require('./Entrenador');
const Entrenamiento = require('./Entrenamiento');
const Partido = require('./Partido');

// ---- Asociaciones ----
Rol.hasMany(Usuario, { foreignKey: 'id_rol' });
Usuario.belongsTo(Rol, { foreignKey: 'id_rol', as: 'rol' });

Usuario.belongsToMany(Seccion, {
  through: 'usuario_secciones',
  foreignKey: 'id_usuario',
  otherKey: 'id_seccion',
  as: 'secciones',
  timestamps: false
});
Seccion.belongsToMany(Usuario, {
  through: 'usuario_secciones',
  foreignKey: 'id_seccion',
  otherKey: 'id_usuario',
  as: 'usuarios',
  timestamps: false
});

Temporada.hasMany(Categoria, { foreignKey: 'id_temporada' });
Categoria.belongsTo(Temporada, { foreignKey: 'id_temporada', as: 'temporada' });

Temporada.hasMany(Jugador, { foreignKey: 'id_temporada' });
Jugador.belongsTo(Temporada, { foreignKey: 'id_temporada', as: 'temporada' });

Temporada.hasMany(Entrenador, { foreignKey: 'id_temporada' });
Entrenador.belongsTo(Temporada, { foreignKey: 'id_temporada', as: 'temporada' });

Categoria.hasMany(Jugador, { foreignKey: 'id_categoria' });
Jugador.belongsTo(Categoria, { foreignKey: 'id_categoria', as: 'categoria' });

Categoria.hasMany(Entrenador, { foreignKey: 'id_categoria', as: 'entrenadores' });
Entrenador.belongsTo(Categoria, { foreignKey: 'id_categoria', as: 'categoria' });

Categoria.belongsTo(Entrenador, { foreignKey: 'id_entrenador', as: 'entrenador' });
Entrenador.hasMany(Categoria, { foreignKey: 'id_entrenador', as: 'categoriasResponsable' });

Categoria.hasMany(Entrenamiento, { foreignKey: 'id_categoria' });
Entrenamiento.belongsTo(Categoria, { foreignKey: 'id_categoria', as: 'categoria' });

Categoria.hasMany(Partido, { foreignKey: 'id_categoria' });
Partido.belongsTo(Categoria, { foreignKey: 'id_categoria', as: 'categoria' });

Lugar.hasMany(Entrenamiento, { foreignKey: 'id_lugar' });
Entrenamiento.belongsTo(Lugar, { foreignKey: 'id_lugar', as: 'lugar' });

Lugar.hasMany(Partido, { foreignKey: 'id_lugar' });
Partido.belongsTo(Lugar, { foreignKey: 'id_lugar', as: 'lugar' });

module.exports = {
  sequelize,
  Rol,
  Usuario,
  Seccion,
  Temporada,
  Lugar,
  Categoria,
  Jugador,
  Entrenador,
  Entrenamiento,
  Partido
};
