import { defineStore } from 'pinia';
import api from '../services/api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    user: JSON.parse(localStorage.getItem('user') || 'null'),
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    role: (state) => state.user?.role || null,
    isAdmin: (state) => state.user?.role === 'admin',
    isCoordinador: (state) => state.user?.role === 'coordinador',
    isEntrenador: (state) => state.user?.role === 'entrenador',
    // admin y coordinador gestionan todo; entrenador solo su(s) categoria(s)
    canManage: (state) => ['admin', 'coordinador'].includes(state.user?.role),
    categoryIds: (state) => state.user?.categoryIds || [],
  },

  actions: {
    async login(email, password) {
      const { data } = await api.post('/auth/login', { email, password });
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    },

    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
  },
});
