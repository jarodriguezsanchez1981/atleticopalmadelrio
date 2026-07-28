import { defineStore } from 'pinia';
import { authService } from '../services';

const SECCION_ORDER = [
  'calendario',
  'entrenamientos',
  'partidos',
  'temporadas',
  'lugares',
  'categorias',
  'jugadores',
  'entrenadores',
  'roles',
  'administracion'
];

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('apr_token') || null,
    user: JSON.parse(localStorage.getItem('apr_user') || 'null'),
    cargando: false
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    rol: (state) => state.user?.rol || null,
    esAdministrador: (state) => state.user?.rol === 'administrador',
    secciones: (state) => state.user?.secciones || [],
    nombreCompleto: (state) => (state.user ? `${state.user.nombre} ${state.user.apellidos}` : ''),
    primeraSeccion: (state) => {
      const set = new Set(state.user?.secciones || []);
      // admin sin secciones aún: acceso total de fallback
      if (state.user?.rol === 'administrador' && set.size === 0) return 'administracion';
      return SECCION_ORDER.find((s) => set.has(s)) || 'calendario';
    }
  },

  actions: {
    puedeVer(clave) {
      if (!this.user) return false;
      const secs = this.user.secciones || [];
      // Compatibilidad: admin antiguo sin secciones asignadas ve todo
      if (this.user.rol === 'administrador' && secs.length === 0) return true;
      return secs.includes(clave);
    },

    async login(usuario, password) {
      this.cargando = true;
      try {
        const { token, user } = await authService.login(usuario, password);
        this.token = token;
        this.user = user;
        localStorage.setItem('apr_token', token);
        localStorage.setItem('apr_user', JSON.stringify(user));
        return user;
      } finally {
        this.cargando = false;
      }
    },

    async restoreSession() {
      if (!this.token) return;
      try {
        const user = await authService.me();
        this.user = user;
        localStorage.setItem('apr_user', JSON.stringify(user));
      } catch {
        this.logout();
      }
    },

    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('apr_token');
      localStorage.removeItem('apr_user');
    }
  }
});
