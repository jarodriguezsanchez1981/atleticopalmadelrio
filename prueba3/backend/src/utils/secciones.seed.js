const SECCIONES = [
  { clave: 'calendario', nombre: 'Calendario', icono: 'pi pi-calendar', orden: 10 },
  { clave: 'entrenamientos', nombre: 'Entrenamientos', icono: 'pi pi-stopwatch', orden: 20 },
  { clave: 'entrenamientos_jugadores', nombre: 'Entrenamientos Jugadores', icono: 'pi pi-check-square', orden: 22 },
  { clave: 'partidos', nombre: 'Partidos', icono: 'pi pi-flag', orden: 30 },
  { clave: 'temporadas', nombre: 'Temporadas', icono: 'pi pi-clock', orden: 40 },
  { clave: 'titulos', nombre: 'Títulos', icono: 'pi pi-graduation-cap', orden: 45 },
  { clave: 'division', nombre: 'División', icono: 'pi pi-tags', orden: 47 },
  { clave: 'lugares', nombre: 'Lugares', icono: 'pi pi-map-marker', orden: 50 },
  { clave: 'delegados', nombre: 'Delegados', icono: 'pi pi-user-plus', orden: 55 },
  { clave: 'categorias', nombre: 'Categorías', icono: 'pi pi-sitemap', orden: 60 },
  { clave: 'equipos', nombre: 'Equipos', icono: 'pi pi-trophy', orden: 65 },
  { clave: 'equipos_jugadores', nombre: 'Jugadores de Equipos', icono: 'pi pi-user', orden: 66 },
  { clave: 'incidencias', nombre: 'Incidencias', icono: 'pi pi-exclamation-triangle', orden: 68 },
  { clave: 'jugadores', nombre: 'Jugadores', icono: 'pi pi-users', orden: 70 },
  { clave: 'plantillas', nombre: 'Plantillas', icono: 'pi pi-table', orden: 75 },
  { clave: 'promociones', nombre: 'Promociones', icono: 'pi pi-arrow-up', orden: 77 },
  { clave: 'entrenadores', nombre: 'Entrenadores', icono: 'pi pi-id-card', orden: 80 },
  { clave: 'patrocinadores', nombre: 'Patrocinadores', icono: 'pi pi-briefcase', orden: 90 },
  { clave: 'categoria_calendario', nombre: 'Jornadas', icono: 'pi pi-calendar-plus', orden: 93 },
  { clave: 'informes', nombre: 'Informes', icono: 'pi pi-file', orden: 98 },
  { clave: 'administracion', nombre: 'Administración', icono: 'pi pi-user-cog', orden: 100 }
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
