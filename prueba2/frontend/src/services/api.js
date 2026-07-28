import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000
});

// Adjunta el JWT a cada petición si existe sesión
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('apr_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Si el token caduca o es inválido, cierra sesión y manda al login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('apr_token');
      localStorage.removeItem('apr_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
