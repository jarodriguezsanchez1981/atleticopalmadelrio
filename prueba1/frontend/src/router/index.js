import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('../views/DashboardView.vue'),
      },
      {
        path: 'calendario',
        name: 'calendario',
        component: () => import('../views/CalendarView.vue'),
      },
      {
        path: 'plantilla',
        name: 'plantilla',
        component: () => import('../views/SquadView.vue'),
        // Coordinador ve todas las categorias, entrenador solo la suya (filtrado dentro de la vista)
      },
      {
        path: 'entrenamientos',
        name: 'entrenamientos',
        component: () => import('../views/TrainingsView.vue'),
      },
      {
        path: 'partidos',
        name: 'partidos',
        component: () => import('../views/MatchesView.vue'),
      },
      {
        path: 'estadisticas',
        name: 'estadisticas',
        component: () => import('../views/StatsView.vue'),
      },
      {
        path: 'categorias',
        name: 'categorias',
        component: () => import('../views/CategoriesAdminView.vue'),
        meta: { roles: ['admin', 'coordinador'] }, // solo gestion, no entrenador
      },
    ],
  },
  {
    path: '/no-autorizado',
    name: 'unauthorized',
    component: () => import('../views/UnauthorizedView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const auth = useAuthStore();

  if (to.meta.public) return next();

  if (to.meta.requiresAuth !== false && !auth.isAuthenticated) {
    return next({ name: 'login' });
  }

  // Comprobacion de roles a nivel de ruta (defensa en el front;
  // el backend re-valida siempre con el middleware authorize())
  if (to.meta.roles && !to.meta.roles.includes(auth.role)) {
    return next({ name: 'unauthorized' });
  }

  next();
});

export default router;
