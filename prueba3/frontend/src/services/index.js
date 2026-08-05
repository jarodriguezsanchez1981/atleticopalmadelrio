import api from './api';

/**
 * Fábrica de servicios CRUD REST estándar.
 * Evita repetir el mismo boilerplate para usuarios, categorías,
 * jugadores, entrenamientos y partidos.
 */
export function crudService(resource) {
  return {
    listar: (params = {}) => api.get(`/${resource}`, { params }).then(r => r.data),
    obtener: (id) => api.get(`/${resource}/${id}`).then(r => r.data),
    crear: (payload) => api.post(`/${resource}`, payload).then(r => r.data),
    actualizar: (id, payload) => api.put(`/${resource}/${id}`, payload).then(r => r.data),
    eliminar: (id) => api.delete(`/${resource}/${id}`)
  };
}

export const usuariosService = crudService('usuarios');
export const seccionesService = crudService('secciones');
export const temporadasService = crudService('temporadas');
export const lugaresService = crudService('lugares');
export const titulosService = crudService('titulos');
export const delegadosService = crudService('delegados');
export const categoriasService = crudService('categorias');
export const jugadoresService = crudService('jugadores');
export const entrenadoresService = crudService('entrenadores');
export const entrenamientosService = crudService('entrenamientos');
export const partidosService = crudService('partidos');

export const authService = {
  login: (usuario, password) => api.post('/auth/login', { usuario, password }).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data)
};

export const calendarioService = {
  eventos: (params = {}) => api.get('/calendario', { params }).then(r => r.data)
};
