import { vi } from 'vitest';

/**
 * Devuelve un objeto modelo con todos los métodos usados por los
 * controladores mockeados (vi.fn) para poder asertar sobre ellos.
 * `scope()` devuelve el propio modelo para permitir encadenar
 * (`Usuario.scope('withPassword').findOne(...)`).
 */
export function createModelMock() {
  const model = {
    findAll: vi.fn(),
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findOrCreate: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    save: vi.fn(),
    scope: vi.fn(),
    count: vi.fn(),
    setSecciones: vi.fn(),
    setCategorias: vi.fn(),
    setTitulos: vi.fn(),
    setEntrenadores: vi.fn(),
    setTiposFutbol: vi.fn(),
    bulkCreate: vi.fn()
  };
  model.scope.mockReturnValue(model);
  return model;
}

const ROLES = {
  read: { nivel: 1, etiqueta: 'Solo lectura' },
  write: { nivel: 2, etiqueta: 'Edición y borrado' }
};

function nivelDeRoles(roles) {
  if (!Array.isArray(roles) || !roles.length) return 0;
  return Math.max(...roles.map((r) => ROLES[r]?.nivel || 0));
}

/**
 * Monta el objeto completo `models` tal y como lo consume `../models`,
 * con los modelos que usan los controladores de las secciones.
 */
export function createModelsMock() {
  const models = {
    Usuario: createModelMock(),
    Rol: createModelMock(),
    Seccion: createModelMock(),
    Temporada: createModelMock(),
    Lugar: createModelMock(),
    TipoFutbol: createModelMock(),
    Titulo: createModelMock(),
    Division: createModelMock(),
    Delegado: createModelMock(),
    Categoria: createModelMock(),
    Jugador: createModelMock(),
    Entrenador: createModelMock(),
    Entrenamiento: createModelMock(),
    EntrenamientoSemanal: createModelMock(),
    Partido: createModelMock(),
    Equipo: createModelMock(),
    Incidencia: createModelMock(),
    Resultado: createModelMock(),
    PartidoJugador: createModelMock(),
    EntrenamientoJugador: createModelMock(),
    Patrocinador: createModelMock()
  };
  return models;
}

/**
 * Objeto de modelos compartido que los tests usan como objetivo del
 * interceptor `src/models` -> tests/helpers/models.js. Se resetea en cada
 * test con `vi.clearAllMocks()`.
 */
export const models = createModelsMock();
models.Rol.ROLES = ROLES;
models.Rol.nivelDeRoles = nivelDeRoles;

export const Usuario = models.Usuario;
export const Rol = models.Rol;
export const Seccion = models.Seccion;
export const Temporada = models.Temporada;
export const Lugar = models.Lugar;
export const TipoFutbol = models.TipoFutbol;
export const Titulo = models.Titulo;
export const Division = models.Division;
export const Delegado = models.Delegado;
export const Categoria = models.Categoria;
export const Jugador = models.Jugador;
export const Entrenador = models.Entrenador;
export const Entrenamiento = models.Entrenamiento;
export const EntrenamientoSemanal = models.EntrenamientoSemanal;
export const Partido = models.Partido;
export const Equipo = models.Equipo;
export const Incidencia = models.Incidencia;
export const Resultado = models.Resultado;
export const PartidoJugador = models.PartidoJugador;
export const EntrenamientoJugador = models.EntrenamientoJugador;
export const Patrocinador = models.Patrocinador;

/**
 * Mocks de las utilidades de password y JWT que cargan los controladores
 * mediante `require('../utils/...')`.
 */
export function createPasswordUtilsMock() {
  return {
    isPasswordValid: vi.fn(),
    hashPassword: vi.fn(),
    verifyPassword: vi.fn()
  };
}

export function createJwtUtilsMock() {
  return {
    signToken: vi.fn(),
    verifyToken: vi.fn()
  };
}

export const passwordUtils = createPasswordUtilsMock();
export const jwtUtils = createJwtUtilsMock();
