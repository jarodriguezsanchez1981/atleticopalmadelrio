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
const Equipo = require('./Equipo');

// ---- Asociaciones ----
// Las tablas con PK compuesta (id, nombre) requieren targetKey/sourceKey
// explícitos para que las FK sigan apuntando a la columna `id`.
Usuario.belongsToMany(Seccion, {
  through: 'usuario_secciones',
  foreignKey: 'id_usuario',
  otherKey: 'id_seccion',
  targetKey: 'id',
  as: 'secciones',
  timestamps: false
});
Seccion.belongsToMany(Usuario, {
  through: 'usuario_secciones',
  foreignKey: 'id_seccion',
  sourceKey: 'id',
  otherKey: 'id_usuario',
  as: 'usuarios',
  timestamps: false
});

Temporada.hasMany(Categoria, { foreignKey: 'id_temporada', sourceKey: 'id' });
Categoria.belongsTo(Temporada, { foreignKey: 'id_temporada', targetKey: 'id', as: 'temporada' });

Temporada.hasMany(Jugador, { foreignKey: 'id_temporada', sourceKey: 'id' });
Jugador.belongsTo(Temporada, { foreignKey: 'id_temporada', targetKey: 'id', as: 'temporada' });

Temporada.hasMany(Entrenador, { foreignKey: 'id_temporada', sourceKey: 'id' });
Entrenador.belongsTo(Temporada, { foreignKey: 'id_temporada', targetKey: 'id', as: 'temporada' });

Titulo.belongsToMany(Entrenador, { through: 'entrenador_titulos', foreignKey: 'id_titulo', otherKey: 'id_entrenador', as: 'entrenadores', timestamps: false });
Entrenador.belongsToMany(Titulo, { through: 'entrenador_titulos', foreignKey: 'id_entrenador', otherKey: 'id_titulo', targetKey: 'id', as: 'titulos', timestamps: false });

Temporada.hasMany(Delegado, { foreignKey: 'id_temporada', sourceKey: 'id' });
Delegado.belongsTo(Temporada, { foreignKey: 'id_temporada', targetKey: 'id', as: 'temporada' });

Categoria.belongsToMany(Jugador, { through: 'jugador_categorias', foreignKey: 'id_categoria', sourceKey: 'id', otherKey: 'id_jugador', as: 'jugadores', timestamps: false });
Jugador.belongsToMany(Categoria, { through: 'jugador_categorias', foreignKey: 'id_jugador', otherKey: 'id_categoria', targetKey: 'id', as: 'categorias', timestamps: false });

Categoria.belongsToMany(Entrenador, { through: 'entrenador_categorias', foreignKey: 'id_categoria', sourceKey: 'id', otherKey: 'id_entrenador', as: 'entrenadores', timestamps: false });
Entrenador.belongsToMany(Categoria, { through: 'entrenador_categorias', foreignKey: 'id_entrenador', otherKey: 'id_categoria', targetKey: 'id', as: 'categorias', timestamps: false });

Categoria.belongsTo(Entrenador, { foreignKey: 'id_entrenador', targetKey: 'id', as: 'entrenador' });
Entrenador.hasMany(Categoria, { foreignKey: 'id_entrenador', sourceKey: 'id', as: 'categoriasResponsable' });

Categoria.belongsTo(Delegado, { foreignKey: 'id_delegado', targetKey: 'id', as: 'delegado' });
Delegado.hasMany(Categoria, { foreignKey: 'id_delegado', sourceKey: 'id', as: 'categoriasDelegado' });

Categoria.hasMany(Delegado, { foreignKey: 'id_categoria', sourceKey: 'id' });
Delegado.belongsTo(Categoria, { foreignKey: 'id_categoria', targetKey: 'id', as: 'categoria' });

Categoria.hasMany(Entrenamiento, { foreignKey: 'id_categoria', sourceKey: 'id' });
Entrenamiento.belongsTo(Categoria, { foreignKey: 'id_categoria', targetKey: 'id', as: 'categoria' });

Categoria.hasMany(Partido, { foreignKey: 'id_categoria', sourceKey: 'id' });
Partido.belongsTo(Categoria, { foreignKey: 'id_categoria', targetKey: 'id', as: 'categoria' });

Lugar.hasMany(Entrenamiento, { foreignKey: 'id_lugar', sourceKey: 'id' });
Entrenamiento.belongsTo(Lugar, { foreignKey: 'id_lugar', targetKey: 'id', as: 'lugar' });

Lugar.hasMany(Partido, { foreignKey: 'id_lugar', sourceKey: 'id' });
Partido.belongsTo(Lugar, { foreignKey: 'id_lugar', targetKey: 'id', as: 'lugar' });

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
  Partido,
  Equipo
};
