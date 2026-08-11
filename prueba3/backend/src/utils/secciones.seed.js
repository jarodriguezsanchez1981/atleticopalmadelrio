const SECCIONES = [
  { clave: 'calendario', nombre: 'Calendario', icono: 'pi pi-calendar', orden: 10 },
  { clave: 'entrenamientos', nombre: 'Entrenamientos', icono: 'pi pi-stopwatch', orden: 20 },
  { clave: 'entrenamientos_jugadores', nombre: 'Entrenamientos Jugadores', icono: 'pi pi-check-square', orden: 22 },
  { clave: 'partidos', nombre: 'Partidos', icono: 'pi pi-flag', orden: 30 },
  { clave: 'partidos_jugadores', nombre: 'Convocatorias', icono: 'pi pi-list-check', orden: 32 },
  { clave: 'resultados', nombre: 'Resultados', icono: 'pi pi-chart-bar', orden: 35 },
  { clave: 'temporadas', nombre: 'Temporadas', icono: 'pi pi-clock', orden: 40 },
  { clave: 'titulos', nombre: 'Títulos', icono: 'pi pi-graduation-cap', orden: 45 },
  { clave: 'division', nombre: 'División', icono: 'pi pi-tags', orden: 47 },
  { clave: 'lugares', nombre: 'Lugares', icono: 'pi pi-map-marker', orden: 50 },
  { clave: 'delegados', nombre: 'Delegados', icono: 'pi pi-user-plus', orden: 55 },
  { clave: 'categorias', nombre: 'Categorías', icono: 'pi pi-sitemap', orden: 60 },
  { clave: 'equipos', nombre: 'Equipos', icono: 'pi pi-trophy', orden: 65 },
  { clave: 'incidencias', nombre: 'Incidencias', icono: 'pi pi-exclamation-triangle', orden: 68 },
  { clave: 'jugadores', nombre: 'Jugadores', icono: 'pi pi-users', orden: 70 },
  { clave: 'entrenadores', nombre: 'Entrenadores', icono: 'pi pi-id-card', orden: 80 },
  { clave: 'administracion', nombre: 'Administración', icono: 'pi pi-shield', orden: 100 }
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
