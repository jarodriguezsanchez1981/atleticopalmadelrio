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
    create: vi.fn(),
    destroy: vi.fn(),
    save: vi.fn(),
    scope: vi.fn(),
    setSecciones: vi.fn(),
    setCategorias: vi.fn(),
    setTitulos: vi.fn()
  };
  model.scope.mockReturnValue(model);
  return model;
}

/**
 * Monta el objeto completo `models` tal y como lo consume `../models`,
 * con los modelos que usan los controladores de las secciones.
 */
export function createModelsMock() {
  return {
    Usuario: createModelMock(),
    Seccion: createModelMock(),
    Temporada: createModelMock(),
    Lugar: createModelMock(),
    Titulo: createModelMock(),
    Delegado: createModelMock(),
    Categoria: createModelMock(),
    Jugador: createModelMock(),
    Entrenador: createModelMock(),
    Entrenamiento: createModelMock(),
    Partido: createModelMock(),
    Equipo: createModelMock()
  };
}

/**
 * Objeto de modelos compartido que los tests usan como objetivo del
 * interceptor `src/models` -> tests/helpers/models.js. Se resetea en cada
 * test con `vi.clearAllMocks()`.
 */
export const models = createModelsMock();

export const Usuario = models.Usuario;
export const Seccion = models.Seccion;
export const Temporada = models.Temporada;
export const Lugar = models.Lugar;
export const Titulo = models.Titulo;
export const Delegado = models.Delegado;
export const Categoria = models.Categoria;
export const Jugador = models.Jugador;
export const Entrenador = models.Entrenador;
export const Entrenamiento = models.Entrenamiento;
export const Partido = models.Partido;
export const Equipo = models.Equipo;

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
