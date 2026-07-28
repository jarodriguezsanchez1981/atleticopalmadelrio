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
        path: 'lugares',
        name: 'lugares',
        component: () => import('../views/lugares/Lugares.vue'),
        meta: { seccion: 'lugares' }
      },
      {
        path: 'categorias',
        name: 'categorias',
        component: () => import('../views/categorias/Categorias.vue'),
        meta: { seccion: 'categorias' }
      },
      {
        path: 'jugadores',
        name: 'jugadores',
        component: () => import('../views/jugadores/Jugadores.vue'),
        meta: { seccion: 'jugadores' }
      },
      {
        path: 'entrenadores',
        name: 'entrenadores',
        component: () => import('../views/entrenadores/Entrenadores.vue'),
        meta: { seccion: 'entrenadores' }
      },
      {
        path: 'roles',
        name: 'roles',
        component: () => import('../views/admin/Roles.vue'),
        meta: { seccion: 'roles' }
      },
      {
        path: 'administracion',
        name: 'administracion',
        component: () => import('../views/admin/Usuarios.vue'),
        meta: { seccion: 'administracion' }
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
