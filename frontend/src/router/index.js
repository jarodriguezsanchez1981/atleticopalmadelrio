import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/auth/Login.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: () => {
        const auth = useAuthStore();
        return { name: auth.primeraSeccion || 'calendario' };
      } },
      {
        path: 'calendario',
        name: 'calendario',
        component: () => import('../views/calendario/Calendario.vue'),
        meta: { seccion: 'calendario' }
      },
      {
        path: 'entrenamientos',
        name: 'entrenamientos',
        component: () => import('../views/entrenamientos/Entrenamientos.vue'),
        meta: { seccion: 'entrenamientos' }
      },
      {
        path: 'partidos',
        name: 'partidos',
        component: () => import('../views/partidos/Partidos.vue'),
        meta: { seccion: 'partidos' }
      },
      {
        path: 'temporadas',
        name: 'temporadas',
        component: () => import('../views/temporadas/Temporadas.vue'),
        meta: { seccion: 'temporadas' }
      },
      {
        path: 'titulos',
        name: 'titulos',
        component: () => import('../views/titulos/Titulos.vue'),
        meta: { seccion: 'titulos' }
      },
      {
        path: 'division',
        name: 'division',
        component: () => import('../views/division/Division.vue'),
        meta: { seccion: 'division' }
      },
      {
        path: 'posicion',
        name: 'posicion',
        component: () => import('../views/posicion/Posicion.vue'),
        meta: { seccion: 'posicion' }
      },
      {
        path: 'lugares',
        name: 'lugares',
        component: () => import('../views/lugares/Lugares.vue'),
        meta: { seccion: 'lugares' }
      },
      {
        path: 'delegados',
        name: 'delegados',
        component: () => import('../views/delegados/Delegados.vue'),
        meta: { seccion: 'delegados' }
      },
      {
        path: 'categorias',
        name: 'categorias',
        component: () => import('../views/categorias/Categorias.vue'),
        meta: { seccion: 'categorias' }
      },
      {
        path: 'equipos',
        name: 'equipos',
        component: () => import('../views/equipos/Equipos.vue'),
        meta: { seccion: 'equipos' }
      },
      {
        path: 'equipos-jugadores',
        name: 'equipos-jugadores',
        component: () => import('../views/equiposJugadores/EquiposJugadores.vue'),
        meta: { seccion: 'equipos_jugadores' }
      },
      {
        path: 'jugadores',
        name: 'jugadores',
        component: () => import('../views/jugadores/Jugadores.vue'),
        meta: { seccion: 'jugadores' }
      },
      {
        path: 'plantillas',
        name: 'plantillas',
        component: () => import('../views/plantillas/Plantillas.vue'),
        meta: { seccion: 'plantillas' }
      },
      {
        path: 'entrenadores',
        name: 'entrenadores',
        component: () => import('../views/entrenadores/Entrenadores.vue'),
        meta: { seccion: 'entrenadores' }
      },
      {
        path: 'administracion',
        name: 'administracion',
        component: () => import('../views/admin/Usuarios.vue'),
        meta: { seccion: 'administracion' }
      },
      {
        path: 'categoria-calendario',
        name: 'categoria-calendario',
        component: () => import('../views/categoriaCalendario/CategoriaCalendario.vue'),
        meta: { seccion: 'categoria_calendario' }
      },
      {
        path: 'torneo',
        name: 'torneo',
        component: () => import('../views/torneo/Torneo.vue'),
        meta: { seccion: 'torneo' }
      },
      {
        path: 'sanciones',
        name: 'sanciones',
        component: () => import('../views/sanciones/Sanciones.vue'),
        meta: { seccion: 'sanciones' }
      },
      {
        path: 'informes',
        name: 'informes',
        component: () => import('../views/informes/Informes.vue'),
        meta: { seccion: 'informes' }
      },
      {
        path: 'cambios',
        name: 'cambios',
        component: () => import('../views/cambios/Cambios.vue'),
        meta: { seccion: 'cambios' }
      },
      {
        path: 'promociones',
        name: 'promociones',
        component: () => import('../views/promociones/Promociones.vue'),
        meta: { seccion: 'promociones' }
      }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to) => {
  const auth = useAuthStore();

  if (to.meta.public) {
    if (to.name === 'login' && auth.isAuthenticated) {
      return { name: auth.primeraSeccion };
    }
    return true;
  }

  if (!auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  if (to.meta.seccion && !auth.puedeVer(to.meta.seccion)) {
    return { name: auth.primeraSeccion };
  }

  return true;
});

export default router;
