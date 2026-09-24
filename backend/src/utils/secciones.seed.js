// `grupo` decide en qué apartado del menú lateral aparece cada sección
// (club/liga/competicion/admin); null = fuera de esos apartados (o todavía
// sin enlace propio en el menú, como incidencias/entrenamientos_jugadores).
// El orden dentro de cada grupo lo da `orden`, editable desde /secciones.
const SECCIONES = [
  { clave: 'dashboard', nombre: 'Dashboard', icono: 'pi pi-th-large', orden: 5, grupo: null },
  { clave: 'calendario', nombre: 'Calendario', icono: 'pi pi-calendar', orden: 10, grupo: null },
  { clave: 'entrenamientos', nombre: 'Entrenamientos', icono: 'pi pi-stopwatch', orden: 20, grupo: 'club' },
  { clave: 'entrenamientos_jugadores', nombre: 'Entrenamientos Jugadores', icono: 'pi pi-check-square', orden: 22, grupo: null },
  { clave: 'partidos', nombre: 'Partidos', icono: 'pi pi-flag', orden: 30, grupo: 'liga' },
  { clave: 'convocatorias', nombre: 'Convocatorias', icono: 'pi pi-list-check', orden: 32, grupo: 'liga' },
  { clave: 'temporadas', nombre: 'Temporadas', icono: 'pi pi-clock', orden: 40, grupo: 'club' },
  { clave: 'titulos', nombre: 'Títulos', icono: 'pi pi-graduation-cap', orden: 45, grupo: 'club' },
  { clave: 'division', nombre: 'División', icono: 'pi pi-tags', orden: 47, grupo: 'club' },
  { clave: 'posicion', nombre: 'Posición', icono: 'pi pi-directions', orden: 48, grupo: 'club' },
  { clave: 'lugares', nombre: 'Lugares', icono: 'pi pi-map-marker', orden: 50, grupo: 'club' },
  { clave: 'material', nombre: 'Material', icono: 'pi pi-box', orden: 52, grupo: 'club' },
  { clave: 'delegados', nombre: 'Delegados', icono: 'pi pi-user-plus', orden: 55, grupo: 'club' },
  { clave: 'coordinadores', nombre: 'Coordinadores', icono: 'pi pi-address-book', orden: 56, grupo: 'club' },
  { clave: 'categorias', nombre: 'Categorías', icono: 'pi pi-sitemap', orden: 60, grupo: 'club' },
  { clave: 'equipos', nombre: 'Equipos', icono: 'pi pi-trophy', orden: 65, grupo: 'competicion' },
  { clave: 'incidencias', nombre: 'Incidencias', icono: 'pi pi-exclamation-triangle', orden: 68, grupo: null },
  { clave: 'jugadores', nombre: 'Jugadores', icono: 'pi pi-users', orden: 70, grupo: 'club' },
  { clave: 'plantillas', nombre: 'Plantillas', icono: 'pi pi-table', orden: 75, grupo: 'club' },
  { clave: 'promociones', nombre: 'Promociones', icono: 'pi pi-arrow-up', orden: 77, grupo: 'club' },
  { clave: 'entrenadores', nombre: 'Entrenadores', icono: 'pi pi-id-card', orden: 80, grupo: 'club' },
  { clave: 'categoria_calendario', nombre: 'Jornadas', icono: 'pi pi-calendar-plus', orden: 93, grupo: 'liga' },
  { clave: 'torneo', nombre: 'Torneo', icono: 'pi pi-trophy', orden: 94, grupo: 'competicion' },
  { clave: 'informes', nombre: 'Informes', icono: 'pi pi-file', orden: 98, grupo: 'competicion' },
  { clave: 'sanciones', nombre: 'Sanciones', icono: 'pi pi-ban', orden: 99, grupo: 'liga' },
  { clave: 'administracion', nombre: 'Administración', icono: 'pi pi-user-cog', orden: 100, grupo: 'admin' },
  { clave: 'cambios', nombre: 'Cambios', icono: 'pi pi-history', orden: 102, grupo: 'admin' }
];

async function ensureSecciones(Seccion) {
  for (const s of SECCIONES) {
    await Seccion.findOrCreate({
      where: { clave: s.clave },
      defaults: s
    });
  }
  return Seccion.findAll({ order: [['orden', 'ASC']] });
}

module.exports = { SECCIONES, ensureSecciones };
