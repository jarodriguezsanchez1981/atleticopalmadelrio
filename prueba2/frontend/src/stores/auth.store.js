import { defineStore } from 'pinia';
import { authService } from '../services';

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
    nombreCompleto: (state) => state.user ? `${state.user.nombre} ${state.user.apellidos}` : ''
  },

  actions: {
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

    // Al recargar la página, si hay token guardado, valida que siga siendo
    // correcto pidiendo /auth/me antes de dejar entrar a rutas protegidas.
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
