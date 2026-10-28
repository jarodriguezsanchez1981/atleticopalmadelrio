import api from './api';
import { RAYAS, componerRayas } from '../utils/coloresEquipacion';

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

export const usuariosService = {
  ...crudService('usuarios'),
  // Un administrador resetea el 2FA de otro usuario (lo tendrá que reconfigurar).
  resetear2fa: (id) => api.post(`/usuarios/${id}/2fa/reset`).then(r => r.data)
};
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
export const personalService = crudService('personal');
export const tiposPersonalService = crudService('tipos-personal');
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
  eliminar: (id, alcance) => api.delete(`/entrenamientos/${id}`, { params: alcance ? { alcance } : undefined }).then(r => r.data),
  // Adjunto de la sesión (PDF o imagen, en base64). Es solo de esa sesión.
  subirAdjunto: (id, adjunto, nombre) => api.put(`/entrenamientos/${id}/adjunto`, { adjunto, adjunto_nombre: nombre }).then(r => r.data),
  eliminarAdjunto: (id) => api.delete(`/entrenamientos/${id}/adjunto`).then(r => r.data)
};
export const partidosService = {
  ...crudService('partidos'),
  finalizarActa: (id, payload = {}) => api.post(`/partidos/${id}/finalizar-acta`, payload).then(r => r.data)
};
export const convocatoriasService = {
  ...crudService('convocatorias'),
  // Senior A: envía la convocatoria por correo al entrenador.
  enviarCorreo: (id) => api.post(`/convocatorias/${id}/enviar-correo`).then(r => r.data)
};
/** Si la camiseta, las calzonas o las medias son "Rayas", compone el color1/color2
 * elegidos en cada combo en un único texto antes de enviarlo. */
function prepararPayloadEquipo(payload) {
  const p = { ...payload };
  ['camiseta', 'calzonas', 'medias'].forEach((campo) => {
    if (p[campo] === RAYAS) {
      p[campo] = componerRayas(p[`${campo}Color1`], p[`${campo}Color2`]);
    }
    delete p[`${campo}Color1`];
    delete p[`${campo}Color2`];
  });
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
export const promocionesService = {
  ...crudService('promociones'),
  // Promociones con promocion_rfaf / promocion_categoria (partidos jugados fuera de su plantilla).
  resumen: () => api.get('/promociones/resumen').then(r => r.data)
};
export const torneosService = crudService('torneos');
export const estadisticasService = {
  listar: (params = {}) => api.get('/estadisticas', { params }).then(r => r.data),
  equipo: (params = {}) => api.get('/estadisticas/equipo', { params }).then(r => r.data),
  // Goles del equipo contrario por periodo (tabla aparte en Estadísticas Goles).
  golesContra: (params = {}) => api.get('/estadisticas/goles-contra', { params }).then(r => r.data),
  // Goles y tarjetas de cada equipo contrario (Estadísticas Senior A Rivales).
  rivales: (params = {}) => api.get('/estadisticas/rivales', { params }).then(r => r.data),
  // Clasificación de la liga por jornada; guardar copia de RFAF la siguiente jornada.
  clasificacion: (params = {}) => api.get('/estadisticas/clasificacion', { params }).then(r => r.data),
  // Victorias/empates/derrotas por plantilla de la temporada actual (Dashboard).
  balance: () => api.get('/estadisticas/balance').then(r => r.data),
  // Plantillas de la temporada actual (filtradas por la categoría del usuario),
  // con sus jugadores, para las Estadísticas por categoría.
  plantillas: () => api.get('/estadisticas/plantillas').then(r => r.data)
};

export const cambiosService = {
  listar: (params = {}) => api.get('/cambios', { params }).then(r => r.data),
  obtener: (id) => api.get(`/cambios/${id}`).then(r => r.data)
};

export const authService = {
  login: (usuario, password) => api.post('/auth/login', { usuario, password }).then(r => r.data),
  // Segundo factor (2FA). La cookie temporal `apr_2fa` identifica al usuario.
  verificar2fa: (codigo) => api.post('/auth/2fa/verificar', { codigo }).then(r => r.data),
  enrolar2faInicio: () => api.post('/auth/2fa/configurar/inicio').then(r => r.data),
  enrolar2faConfirmar: (codigo) => api.post('/auth/2fa/configurar/confirmar', { codigo }).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
  logout: () => api.post('/auth/logout').then(r => r.data),
  cambiarPassword: (passwordActual, password, confirmacion) => api.post('/auth/cambiar-password', { password_actual: passwordActual, password, confirmacion }).then(r => r.data),
  // Restablecer contraseña por email (sin sesión).
  recuperarPassword: (identificador) => api.post('/auth/recuperar-password', { identificador }).then(r => r.data),
  validarTokenReset: (token) => api.get('/auth/restablecer-password/validar', { params: { token } }).then(r => r.data),
  restablecerPassword: (token, password, confirmacion) => api.post('/auth/restablecer-password', { token, password, confirmacion }).then(r => r.data)
};

// Cuentas de correo internas (solo admin). CRUD + envío de prueba.
export const cuentasCorreoService = {
  ...crudService('cuentas-correo'),
  probar: (id, destino) => api.post(`/cuentas-correo/${id}/probar`, { destino }).then(r => r.data),
  verificar: (config) => api.post('/cuentas-correo/verificar', config).then(r => r.data)
};

export const calendarioService = {
  eventos: (params = {}) => api.get('/calendario', { params }).then(r => r.data),
  escudos: (ids = []) => api.get('/calendario/escudos', { params: { ids: ids.join(',') } }).then(r => r.data)
};

export const utilService = {
  imagen: (url) => api.get('/util/imagen', { params: { url } }).then(r => r.data)
};
