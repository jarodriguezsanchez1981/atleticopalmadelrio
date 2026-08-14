const sequelize = require('../config/db');

const Usuario = require('./Usuario');
const Rol = require('./Rol');
const Seccion = require('./Seccion');
const Temporada = require('./Temporada');
const Lugar = require('./Lugar');
const Titulo = require('./Titulo');
const Division = require('./Division');
const Delegado = require('./Delegado');
const Categoria = require('./Categoria');
const Jugador = require('./Jugador');
const Entrenador = require('./Entrenador');
const Entrenamiento = require('./Entrenamiento');
const EntrenamientoSemanal = require('./EntrenamientoSemanal');
const Partido = require('./Partido');
const Equipo = require('./Equipo');
const Incidencia = require('./Incidencia');
const Resultado = require('./Resultado');
const PartidoJugador = require('./PartidoJugador');
const EntrenamientoJugador = require('./EntrenamientoJugador');
const TipoFutbol = require('./TipoFutbol');

// ---- Asociaciones ----
// Las tablas con PK compuesta (id, nombre) requieren targetKey/sourceKey
// explícitos para que las FK sigan apuntando a la columna `id`.
Usuario.hasMany(Rol, { foreignKey: 'id_usuario', sourceKey: 'id', as: 'roles', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Rol.belongsTo(Usuario, { foreignKey: 'id_usuario', targetKey: 'id', as: 'usuario', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

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
Categoria.belongsTo(Temporada, { foreignKey: 'id_temporada', targetKey: 'id', as: 'temporada', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

Division.hasMany(Categoria, { foreignKey: 'id_division', sourceKey: 'id' });
Categoria.belongsTo(Division, { foreignKey: 'id_division', targetKey: 'id', as: 'division', onDelete: 'SET NULL', onUpdate: 'CASCADE' });

Temporada.hasMany(Jugador, { foreignKey: 'id_temporada', sourceKey: 'id' });
Jugador.belongsTo(Temporada, { foreignKey: 'id_temporada', targetKey: 'id', as: 'temporada', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

Temporada.hasMany(Entrenador, { foreignKey: 'id_temporada', sourceKey: 'id' });
Entrenador.belongsTo(Temporada, { foreignKey: 'id_temporada', targetKey: 'id', as: 'temporada', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

Titulo.belongsToMany(Entrenador, { through: 'entrenador_titulos', foreignKey: 'id_titulo', otherKey: 'id_entrenador', as: 'entrenadores', timestamps: false });
Entrenador.belongsToMany(Titulo, { through: 'entrenador_titulos', foreignKey: 'id_entrenador', otherKey: 'id_titulo', targetKey: 'id', as: 'titulos', timestamps: false });

Temporada.hasMany(Delegado, { foreignKey: 'id_temporada', sourceKey: 'id' });
Delegado.belongsTo(Temporada, { foreignKey: 'id_temporada', targetKey: 'id', as: 'temporada', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

Categoria.belongsToMany(Jugador, { through: 'jugador_categorias', foreignKey: 'id_categoria', sourceKey: 'id', otherKey: 'id_jugador', as: 'jugadores', timestamps: false });
Jugador.belongsToMany(Categoria, { through: 'jugador_categorias', foreignKey: 'id_jugador', otherKey: 'id_categoria', targetKey: 'id', as: 'categorias', timestamps: false });

Categoria.belongsToMany(Entrenador, { through: 'entrenador_categorias', foreignKey: 'id_categoria', sourceKey: 'id', otherKey: 'id_entrenador', as: 'entrenadores', timestamps: false });
Entrenador.belongsToMany(Categoria, { through: 'entrenador_categorias', foreignKey: 'id_entrenador', otherKey: 'id_categoria', targetKey: 'id', as: 'categorias', timestamps: false });

Categoria.belongsTo(Entrenador, { foreignKey: 'id_entrenador', targetKey: 'id', as: 'entrenador', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
Entrenador.hasMany(Categoria, { foreignKey: 'id_entrenador', sourceKey: 'id', as: 'categoriasResponsable' });

Categoria.belongsTo(Delegado, { foreignKey: 'id_delegado', targetKey: 'id', as: 'delegado', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
Delegado.hasMany(Categoria, { foreignKey: 'id_delegado', sourceKey: 'id', as: 'categoriasDelegado' });

Categoria.hasMany(Delegado, { foreignKey: 'id_categoria', sourceKey: 'id' });
Delegado.belongsTo(Categoria, { foreignKey: 'id_categoria', targetKey: 'id', as: 'categoria', onDelete: 'SET NULL', onUpdate: 'CASCADE' });

Categoria.hasMany(Entrenamiento, { foreignKey: 'id_categoria', sourceKey: 'id' });
Entrenamiento.belongsTo(Categoria, { foreignKey: 'id_categoria', targetKey: 'id', as: 'categoria', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

Categoria.hasMany(Partido, { foreignKey: 'id_categoria', sourceKey: 'id' });
Partido.belongsTo(Categoria, { foreignKey: 'id_categoria', targetKey: 'id', as: 'categoria', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
Lugar.hasMany(Entrenamiento, { foreignKey: 'id_lugar', sourceKey: 'id' });
Entrenamiento.belongsTo(Lugar, { foreignKey: 'id_lugar', targetKey: 'id', as: 'lugar', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

Lugar.hasMany(Partido, { foreignKey: 'id_lugar', sourceKey: 'id' });
Partido.belongsTo(Lugar, { foreignKey: 'id_lugar', targetKey: 'id', as: 'lugar', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

Equipo.hasMany(Partido, { foreignKey: 'id_equipo', sourceKey: 'id' });
Partido.belongsTo(Equipo, { foreignKey: 'id_equipo', targetKey: 'id', as: 'equipo', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

Partido.hasMany(Resultado, { foreignKey: 'id_partido', sourceKey: 'id', onDelete: 'CASCADE' });
Resultado.belongsTo(Partido, { foreignKey: 'id_partido', targetKey: 'id', as: 'partido' });

Partido.hasMany(PartidoJugador, { foreignKey: 'id_partido', sourceKey: 'id', onDelete: 'CASCADE', as: 'convocados' });
PartidoJugador.belongsTo(Partido, { foreignKey: 'id_partido', targetKey: 'id', as: 'partido' });

Jugador.hasMany(PartidoJugador, { foreignKey: 'id_jugador', sourceKey: 'id', onDelete: 'CASCADE', as: 'convocatorias' });
PartidoJugador.belongsTo(Jugador, { foreignKey: 'id_jugador', targetKey: 'id', as: 'jugador' });

Entrenamiento.hasMany(EntrenamientoJugador, { foreignKey: 'id_entrenamiento', sourceKey: 'id', onDelete: 'CASCADE', as: 'asistencias' });
EntrenamientoJugador.belongsTo(Entrenamiento, { foreignKey: 'id_entrenamiento', targetKey: 'id', as: 'entrenamiento' });

Entrenamiento.hasMany(EntrenamientoSemanal, { foreignKey: 'id_entrenamiento', sourceKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE', as: 'semanales' });
EntrenamientoSemanal.belongsTo(Entrenamiento, { foreignKey: 'id_entrenamiento', targetKey: 'id', as: 'entrenamiento', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

Jugador.hasMany(EntrenamientoJugador, { foreignKey: 'id_jugador', sourceKey: 'id', onDelete: 'CASCADE', as: 'asistencias' });
EntrenamientoJugador.belongsTo(Jugador, { foreignKey: 'id_jugador', targetKey: 'id', as: 'jugador' });

Categoria.hasMany(Incidencia, { foreignKey: 'id_categoria', sourceKey: 'id' });
Incidencia.belongsTo(Categoria, { foreignKey: 'id_categoria', targetKey: 'id', as: 'categoria', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

Usuario.hasMany(Entrenamiento, { foreignKey: 'id_usuario', sourceKey: 'id' });
Entrenamiento.belongsTo(Usuario, { foreignKey: 'id_usuario', targetKey: 'id', as: 'usuario', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

Usuario.hasMany(Partido, { foreignKey: 'id_usuario', sourceKey: 'id' });
Partido.belongsTo(Usuario, { foreignKey: 'id_usuario', targetKey: 'id', as: 'usuario', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

Usuario.hasMany(Incidencia, { foreignKey: 'id_usuario', sourceKey: 'id' });
Incidencia.belongsTo(Usuario, { foreignKey: 'id_usuario', targetKey: 'id', as: 'usuario', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

Jugador.hasMany(Incidencia, { foreignKey: 'id_jugador', sourceKey: 'id' });
Incidencia.belongsTo(Jugador, { foreignKey: 'id_jugador', targetKey: 'id', as: 'jugador', onDelete: 'SET NULL', onUpdate: 'CASCADE' });

Entrenador.hasMany(Incidencia, { foreignKey: 'id_entrenador', sourceKey: 'id' });
Incidencia.belongsTo(Entrenador, { foreignKey: 'id_entrenador', targetKey: 'id', as: 'entrenador', onDelete: 'SET NULL', onUpdate: 'CASCADE' });

Delegado.hasMany(Incidencia, { foreignKey: 'id_delegado', sourceKey: 'id' });
Incidencia.belongsTo(Delegado, { foreignKey: 'id_delegado', targetKey: 'id', as: 'delegado', onDelete: 'SET NULL', onUpdate: 'CASCADE' });

TipoFutbol.hasMany(Categoria, { foreignKey: 'id_tipofutbol', sourceKey: 'id' });
Categoria.belongsTo(TipoFutbol, { foreignKey: 'id_tipofutbol', targetKey: 'id', as: 'tipofutbol', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

Lugar.belongsToMany(TipoFutbol, {
  through: 'lugar_tipofutbol',
  foreignKey: 'id_lugar',
  sourceKey: 'id',
  otherKey: 'id_tipofutbol',
  as: 'tiposFutbol',
  timestamps: false
});
TipoFutbol.belongsToMany(Lugar, {
  through: 'lugar_tipofutbol',
  foreignKey: 'id_tipofutbol',
  sourceKey: 'id',
  otherKey: 'id_lugar',
  as: 'lugares',
  timestamps: false
});

module.exports = {
  sequelize,
  Usuario,
  Rol,
  Seccion,
  Temporada,
  Lugar,
  Titulo,
  Division,
  Delegado,
  Categoria,
  Jugador,
  Entrenador,
  Entrenamiento,
  EntrenamientoSemanal,
  Partido,
  Equipo,
  Incidencia,
  Resultado,
  PartidoJugador,
  EntrenamientoJugador,
  TipoFutbol
};
