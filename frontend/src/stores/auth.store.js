import { defineStore } from 'pinia';
import { authService } from '../services';

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

/** Las Estadísticas son solo de la plantilla Senior A: de los entrenadores,
 * únicamente el de esa categoría las ve (los coordinadores, todas). */
const CATEGORIA_ESTADISTICAS = 'Senior A';
const SECCIONES_SOLO_CATEGORIA_ESTADISTICAS = [
  'estadisticas_convocatorias',
  'estadisticas_tiempo',
  'estadisticas_goles',
  'estadisticas_sanciones',
  'estadisticas_clasificacion'
];

/** Estadísticas por categoría: su público es el resto (entrenadores de otras
 * categorías y coordinadores), así que el entrenador de Senior A no las ve
 * (ya tiene su propio apartado "Estadísticas Senior A"). */
const SECCIONES_OCULTAS_AL_ENTRENADOR_ESTADISTICAS = [
  'estadisticas_cat_convocatorias',
  'estadisticas_cat_goles',
  'estadisticas_cat_sanciones',
  'estadisticas_cat_clasificacion'
];

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
    // Administrador principal: el usuario cuyo login es exactamente "admin".
    // Acceso a recursos muy sensibles (p. ej. las cuentas de correo internas).
    esAdmin: (state) => state.user?.usuario === 'admin',
    primeraSeccion: (state) => {
      const set = new Set(state.user?.secciones || []);
      return SECCION_ORDER.find((s) => set.has(s)) || 'calendario';
    },
    rol: (state) => state.user?.rol || 'coordinador',
    idCategoria: (state) => state.user?.id_categoria || null,
    categoriaNombre: (state) => state.user?.categoria_nombre || null
  },

  actions: {
    puedeVer(clave) {
      if (!this.user) return false;
      if (SECCIONES_SOLO_COORDINADORES.includes(clave) && this.rol !== 'coordinador') return false;
      // Estadísticas (Senior A): un entrenador solo las ve si es el de esa categoría.
      if (
        SECCIONES_SOLO_CATEGORIA_ESTADISTICAS.includes(clave) &&
        this.rol === 'entrenador' &&
        this.categoriaNombre !== CATEGORIA_ESTADISTICAS
      ) return false;
      // Estadísticas por categoría: el entrenador de Senior A no las ve.
      if (
        SECCIONES_OCULTAS_AL_ENTRENADOR_ESTADISTICAS.includes(clave) &&
        this.rol === 'entrenador' &&
        this.categoriaNombre === CATEGORIA_ESTADISTICAS
      ) return false;
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
        // Con 2FA obligatorio, el login no da sesión: devuelve { twofa, nombre }
        // indicando el paso siguiente ('verificar' o 'configurar').
        return await authService.login(usuario, password);
      } finally {
        this.cargando = false;
      }
    },

    /** Guarda el usuario devuelto al completar el 2FA (sesión iniciada). */
    finalizarSesion(user) {
      this.user = user;
      guardarUsuario(user);
      return user;
    },

    /** Paso 2 (ya tiene 2FA): verifica el código y deja la sesión iniciada. */
    async verificar2fa(codigo) {
      const { user } = await authService.verificar2fa(codigo);
      return this.finalizarSesion(user);
    },

    /** Paso 2a (sin 2FA): pide el QR para configurar el autenticador. */
    enrolar2faInicio() {
      return authService.enrolar2faInicio();
    },

    /** Paso 2b (sin 2FA): confirma el código, activa el 2FA e inicia sesión.
     * Devuelve también los códigos de recuperación (se muestran una sola vez). */
    async enrolar2faConfirmar(codigo) {
      const { user, codigos_recuperacion } = await authService.enrolar2faConfirmar(codigo);
      this.finalizarSesion(user);
      return codigos_recuperacion;
    },

    async restoreSession() {
      if (!this.user) return;
      try {
        // /auth/me renueva la cookie con los permisos actuales (si cambian, se
        // aplican con solo recargar la página). La sesión viaja en la cookie
        // HttpOnly, así que no hace falta pasar ningún token.
        const user = await authService.me();
        this.user = user;
        guardarUsuario(user);
      } catch {
        this.limpiarSesion();
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
      localStorage.removeItem('apr_user');
    }
  }
});
