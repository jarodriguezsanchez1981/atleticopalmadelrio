/**
 * La ruta de cada sección no vive en la base de datos (solo clave/nombre/
 * icono/orden/grupo), así que aquí se mantiene el único mapeo clave -> URL
 * que necesita el menú lateral dinámico (MainLayout.vue) para saber a dónde
 * enlaza cada una.
 */
export const RUTA_POR_SECCION = {
  dashboard: '/dashboard',
  calendario: '/calendario',
  entrenamientos: '/entrenamientos',
  partidos: '/partidos',
  convocatorias: '/convocatorias',
  temporadas: '/temporadas',
  titulos: '/titulos',
  division: '/division',
  posicion: '/posicion',
  lugares: '/lugares',
  material: '/material',
  delegados: '/delegados',
  coordinadores: '/coordinadores',
  categorias: '/categorias',
  equipos: '/equipos',
  jugadores: '/jugadores',
  plantillas: '/plantillas',
  entrenadores: '/entrenadores',
  administracion: '/administracion',
  categoria_calendario: '/categoria-calendario',
  torneo: '/torneo',
  sanciones: '/sanciones',
  informes: '/informes',
  cambios: '/cambios',
  promociones: '/promociones'
};
