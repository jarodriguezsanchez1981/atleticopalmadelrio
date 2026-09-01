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
    setTitulos: vi.fn(),
    setTiposFutbol: vi.fn(),
    bulkCreate: vi.fn()
  };
  model.scope.mockReturnValue(model);
  return model;
}

/**
 * Monta el objeto completo `models` tal y como lo consume `../models`,
 * con los modelos que usan los controladores de las secciones.
 */
export function createModelsMock() {
  const models = {
    Usuario: createModelMock(),
    Seccion: createModelMock(),
    Temporada: createModelMock(),
    Lugar: createModelMock(),
    TipoFutbol: createModelMock(),
    Titulo: createModelMock(),
    Division: createModelMock(),
    Posicion: createModelMock(),
    Delegado: createModelMock(),
    Categoria: createModelMock(),
    Jugador: createModelMock(),
    Entrenador: createModelMock(),
    Entrenamiento: createModelMock(),
    Partido: createModelMock(),
    Equipo: createModelMock(),
    Resultado: createModelMock(),
    Patrocinador: createModelMock(),
    Plantilla: createModelMock(),
    PlantillaJugador: createModelMock(),
    PlantillaEntrenador: createModelMock(),
    PlantillaDelegado: createModelMock(),
    Jornada: createModelMock(),
    Sancion: createModelMock(),
    Cambio: createModelMock(),
    EquipoJugador: createModelMock(),
    Promocion: createModelMock()
  };
  return models;
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
export const TipoFutbol = models.TipoFutbol;
export const Titulo = models.Titulo;
export const Division = models.Division;
export const Posicion = models.Posicion;
export const Delegado = models.Delegado;
export const Categoria = models.Categoria;
export const Jugador = models.Jugador;
export const Entrenador = models.Entrenador;
export const Entrenamiento = models.Entrenamiento;
export const Partido = models.Partido;
export const Equipo = models.Equipo;
export const Resultado = models.Resultado;
export const Patrocinador = models.Patrocinador;
export const Plantilla = models.Plantilla;
export const PlantillaJugador = models.PlantillaJugador;
export const PlantillaEntrenador = models.PlantillaEntrenador;
export const PlantillaDelegado = models.PlantillaDelegado;
export const Jornada = models.Jornada;
export const Sancion = models.Sancion;
export const Cambio = models.Cambio;
export const EquipoJugador = models.EquipoJugador;
export const Promocion = models.Promocion;

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
