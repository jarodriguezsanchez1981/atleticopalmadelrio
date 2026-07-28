import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // en dev, Vite hace proxy a http://localhost:4000 (ver vite.config.js)
});

// Adjunta el token JWT guardado en localStorage a cada peticion
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el token caduca o es invalido, cierra sesion y manda al login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
