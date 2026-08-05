const sequelize = require('../config/db');

const Usuario = require('./Usuario');
const Seccion = require('./Seccion');
const Temporada = require('./Temporada');
const Lugar = require('./Lugar');
const Titulo = require('./Titulo');
const Delegado = require('./Delegado');
const Categoria = require('./Categoria');
const Jugador = require('./Jugador');
const Entrenador = require('./Entrenador');
const Entrenamiento = require('./Entrenamiento');
const Partido = require('./Partido');

// ---- Asociaciones ----
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

Titulo.hasMany(Entrenador, { foreignKey: 'id_titulo' });
Entrenador.belongsTo(Titulo, { foreignKey: 'id_titulo', as: 'titulo' });

Temporada.hasMany(Delegado, { foreignKey: 'id_temporada' });
Delegado.belongsTo(Temporada, { foreignKey: 'id_temporada', as: 'temporada' });

Categoria.belongsToMany(Jugador, { through: 'jugador_categorias', foreignKey: 'id_categoria', otherKey: 'id_jugador', as: 'jugadores', timestamps: false });
Jugador.belongsToMany(Categoria, { through: 'jugador_categorias', foreignKey: 'id_jugador', otherKey: 'id_categoria', as: 'categorias', timestamps: false });

Categoria.belongsToMany(Entrenador, { through: 'entrenador_categorias', foreignKey: 'id_categoria', otherKey: 'id_entrenador', as: 'entrenadores', timestamps: false });
Entrenador.belongsToMany(Categoria, { through: 'entrenador_categorias', foreignKey: 'id_entrenador', otherKey: 'id_categoria', as: 'categorias', timestamps: false });

Categoria.belongsTo(Entrenador, { foreignKey: 'id_entrenador', as: 'entrenador' });
Entrenador.hasMany(Categoria, { foreignKey: 'id_entrenador', as: 'categoriasResponsable' });

Categoria.belongsTo(Delegado, { foreignKey: 'id_delegado', as: 'delegado' });
Delegado.hasMany(Categoria, { foreignKey: 'id_delegado', as: 'categoriasDelegado' });

Categoria.hasMany(Delegado, { foreignKey: 'id_categoria' });
Delegado.belongsTo(Categoria, { foreignKey: 'id_categoria', as: 'categoria' });

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
  Usuario,
  Seccion,
  Temporada,
  Lugar,
  Titulo,
  Delegado,
  Categoria,
  Jugador,
  Entrenador,
  Entrenamiento,
  Partido
};
