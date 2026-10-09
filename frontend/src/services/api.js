import axios from 'axios';

/** Token antiguo guardado en el navegador (antes de la cookie HttpOnly); solo
 * se usa una vez para pasar la sesión a la cookie, ver auth.store. */
export const TOKEN_ANTIGUO = 'apr_token';

// La sesión va en una cookie HttpOnly que pone el backend (el JavaScript de la
// página no ve el token). X-Requested-With es obligatoria en las peticiones que
// modifican datos (protección CSRF, ver auth.middleware del backend).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
});

// Si la sesión caduca o es inválida, la cierra y manda al login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_ANTIGUO);
      localStorage.removeItem('apr_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
