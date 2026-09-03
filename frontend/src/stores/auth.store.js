import { defineStore } from 'pinia';
import { authService } from '../services';

const SECCION_ORDER = [
  'calendario',
  'entrenamientos',
  'partidos',
  'temporadas',
  'titulos',
  'lugares',
  'delegados',
  'categorias',
  'equipos',
  'equipos_jugadores',
  'jugadores',
  'plantillas',
  'entrenadores',
  'division',
  'informes',
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
    secciones: (state) => state.user?.secciones || [],
    permisos: (state) => state.user?.permisos || {},
    nombreCompleto: (state) => (state.user ? `${state.user.nombre} ${state.user.apellidos}` : ''),
    primeraSeccion: (state) => {
      const set = new Set(state.user?.secciones || []);
      return SECCION_ORDER.find((s) => set.has(s)) || 'calendario';
    },
    rol: (state) => state.user?.rol || 'coordinador',
    idCategoria: (state) => state.user?.id_categoria || null
  },

  actions: {
    puedeVer(clave) {
      if (!this.user) return false;
      return !!(this.user.permisos?.[clave]?.ver);
    },

    puedeCrear(clave) {
      if (!clave) return false;
      return !!(this.user.permisos?.[clave]?.editar);
    },

    puedeEditar(clave) {
      if (!clave) return false;
      return !!(this.user.permisos?.[clave]?.editar);
    },

    puedeEliminar(clave) {
      if (!clave) return false;
      return !!(this.user.permisos?.[clave]?.editar);
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
