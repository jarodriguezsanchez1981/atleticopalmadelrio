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
      { path: '', redirect: '/calendario' },
      {
        path: 'calendario',
        name: 'calendario',
        component: () => import('../views/calendario/Calendario.vue')
      },
      {
        path: 'entrenamientos',
        name: 'entrenamientos',
        component: () => import('../views/entrenamientos/Entrenamientos.vue')
      },
      {
        path: 'partidos',
        name: 'partidos',
        component: () => import('../views/partidos/Partidos.vue')
      },
      {
        path: 'categorias',
        name: 'categorias',
        component: () => import('../views/categorias/Categorias.vue')
      },
      {
        path: 'jugadores',
        name: 'jugadores',
        component: () => import('../views/jugadores/Jugadores.vue')
      },
      {
        path: 'administracion',
        name: 'administracion',
        component: () => import('../views/admin/Usuarios.vue'),
        meta: { roles: ['administrador'] }
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
    // Si ya está logueado y va al login, lo mandamos directamente dentro
    if (to.name === 'login' && auth.isAuthenticated) return { name: 'calendario' };
    return true;
  }

  if (!auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  if (to.meta.roles && !to.meta.roles.includes(auth.rol)) {
    // Rol sin permiso -> lo devolvemos a una pantalla que sí puede ver
    return { name: 'calendario' };
  }

  return true;
});

export default router;
