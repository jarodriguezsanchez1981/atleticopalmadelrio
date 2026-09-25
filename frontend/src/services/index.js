import api from './api';
import { RAYAS, componerCamisetaRayas } from '../utils/coloresEquipacion';

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
    eliminar: (id) => api.delete(`/${resource}/${id}`),
    importar: (filas) => api.post(`/import/${resource}`, { filas }).then(r => r.data)
  };
}

export const usuariosService = crudService('usuarios');
export const seccionesService = {
  ...crudService('secciones'),
  reordenar: (orden) => api.post('/secciones/reordenar', { orden }).then(r => r.data)
};
export const temporadasService = crudService('temporadas');
export const lugaresService = crudService('lugares');
export const tiposFutbolService = crudService('tipos-futbol');
export const titulosService = crudService('titulos');
export const divisionesService = crudService('divisiones');
export const materialesService = crudService('materiales');
export const posicionesService = crudService('posiciones');
export const delegadosService = crudService('delegados');
export const coordinadoresService = crudService('coordinadores');
export const categoriasService = {
  ...crudService('categorias'),
  reordenar: (desde) => api.post('/categorias/reordenar', { desde }).then(r => r.data)
};
export const jugadoresService = crudService('jugadores');
export const entrenadoresService = crudService('entrenadores');
export const entrenamientosService = {
  ...crudService('entrenamientos'),
  // alcance: 'serie' además elimina el resto de semanas de la misma serie recurrente.
  eliminar: (id, alcance) => api.delete(`/entrenamientos/${id}`, { params: alcance ? { alcance } : undefined }).then(r => r.data)
};
export const partidosService = {
  ...crudService('partidos'),
  importarActa: (id, payload = {}) => api.post(`/partidos/${id}/importar-acta`, payload).then(r => r.data)
};
export const convocatoriasService = crudService('convocatorias');
/** Si la camiseta es "Rayas", compone el color1/color2 elegidos en un único texto antes de enviarlo. */
function prepararPayloadEquipo(payload) {
  const p = { ...payload };
  if (p.camiseta === RAYAS) {
    p.camiseta = componerCamisetaRayas(p.camisetaColor1, p.camisetaColor2);
  }
  delete p.camisetaColor1;
  delete p.camisetaColor2;
  return p;
}

export const equiposService = {
  ...crudService('equipos'),
  crear: (payload) => api.post('/equipos', prepararPayloadEquipo(payload)).then(r => r.data),
  actualizar: (id, payload) => api.put(`/equipos/${id}`, prepararPayloadEquipo(payload)).then(r => r.data),
  descargarEscudos: () => api.get('/equipos/descargar-escudos').then(r => r.data)
};
export const equiposJugadoresService = crudService('equipos-jugadores');
export const categoriaCalendarioService = {
  ...crudService('jornadas'),
  listarNumeros: (params = {}) => api.get('/jornadas/numeros', { params }).then(r => r.data),
};
export const sancionesService = crudService('sanciones');
export const plantillasService = {
  ...crudService('plantillas'),
  crearTemporada: (payload) => api.post('/plantillas/temporada', payload).then(r => r.data)
};
export const promocionesService = crudService('promociones');
export const torneosService = crudService('torneos');

export const cambiosService = {
  listar: (params = {}) => api.get('/cambios', { params }).then(r => r.data),
  obtener: (id) => api.get(`/cambios/${id}`).then(r => r.data)
};

export const authService = {
  login: (usuario, password) => api.post('/auth/login', { usuario, password }).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data)
};

export const calendarioService = {
  eventos: (params = {}) => api.get('/calendario', { params }).then(r => r.data)
};

export const utilService = {
  imagen: (url) => api.get('/util/imagen', { params: { url } }).then(r => r.data)
};
