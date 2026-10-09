import { defineStore } from 'pinia';
import { authService } from '../services';
import { TOKEN_ANTIGUO } from '../services/api';

const SECCION_ORDER = [
  'dashboard',
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

/** Secciones que, además del permiso de la sección, exigen rol coordinador
 * (un entrenador no las ve aunque tenga el permiso marcado). */
const SECCIONES_SOLO_COORDINADORES = ['firma_email'];

function leerUsuario() {
  try {
    return JSON.parse(localStorage.getItem('apr_user') || 'null');
  } catch {
    return null;
  }
}

function guardarUsuario(user) {
  localStorage.setItem('apr_user', JSON.stringify(user));
}

export const useAuthStore = defineStore('auth', {
  // La sesión (el token) está en una cookie HttpOnly que el JavaScript no ve;
  // aquí solo se guardan los datos del usuario para pintar la intranet.
  state: () => ({
    user: leerUsuario(),
    cargando: false
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
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
      if (SECCIONES_SOLO_COORDINADORES.includes(clave) && this.rol !== 'coordinador') return false;
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
        const { user } = await authService.login(usuario, password);
        this.user = user;
        guardarUsuario(user);
        localStorage.removeItem(TOKEN_ANTIGUO);
        return user;
      } finally {
        this.cargando = false;
      }
    },

    async restoreSession() {
      // Sesión de antes de la cookie: se envía una vez para que el backend la
      // pase a la cookie y se borra del navegador.
      const tokenAntiguo = localStorage.getItem(TOKEN_ANTIGUO);
      if (!this.user && !tokenAntiguo) return;
      try {
        // /auth/me renueva la cookie con los permisos actuales (si cambian, se
        // aplican con solo recargar la página).
        const user = await authService.me(tokenAntiguo || undefined);
        this.user = user;
        guardarUsuario(user);
      } catch {
        this.limpiarSesion();
      } finally {
        localStorage.removeItem(TOKEN_ANTIGUO);
      }
    },

    /** Cierra la sesión en el backend (borra la cookie) y en el navegador. */
    async logout() {
      this.limpiarSesion();
      try {
        await authService.logout();
      } catch { /* sin conexión: la cookie caduca sola */ }
    },

    limpiarSesion() {
      this.user = null;
      localStorage.removeItem(TOKEN_ANTIGUO);
      localStorage.removeItem('apr_user');
    }
  }
});
