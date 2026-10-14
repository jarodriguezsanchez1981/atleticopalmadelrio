import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'module';
import { Clasificacion, Partido, Plantilla } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/clasificacion.controller.js';

// Misma instancia CommonJS que usa el controlador, para poder espiar leerClasificacion.
const rfafActa = createRequire(import.meta.url)('../src/utils/rfafActa.js');

const PARTIDOS = [
  { jornada: 1, fecha: new Date('2026-09-13T12:00:00Z') },
  { jornada: 2, fecha: new Date('2026-09-20T17:00:00Z') },
  // La 3 descansa el PALMA.
  { jornada: 4, fecha: new Date('2026-10-04T16:00:00Z') }
];
const SENIOR_A = { id: 36, categoria: { nombre: 'Senior A' }, temporada: { actual: true } };
const equipo = (posicion, nombre, extra = {}) => ({
  posicion, equipo: nombre, codigo_equipo: String(posicion), puntos: 10 - posicion,
  jugados: 1, ganados: 1, empatados: 0, perdidos: 0, goles_favor: 2, goles_contra: 1, puntos_sancion: 0, ...extra
});

describe('Estadísticas Clasificación · clasificacion.controller', () => {
  let leer;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-21T10:00:00Z')); // lunes tras la jornada 2
    Clasificacion.findAll.mockReset();
    Clasificacion.bulkCreate.mockReset();
    Partido.findAll.mockReset();
    Partido.findAll.mockResolvedValue(PARTIDOS);
    Plantilla.findByPk.mockReset();
    Plantilla.findByPk.mockResolvedValue(SENIOR_A);
    leer = vi.spyOn(rfafActa, 'leerClasificacion');
    leer.mockReset();
  });
  afterEach(() => { vi.useRealTimers(); leer.mockRestore(); });

  const llamar = (fn, overrides) => {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, next };
  };

  describe('siguienteJornada', () => {
    it('la primera sin guardar, desde el día siguiente a su partido', async () => {
      expect(await ctrl.siguienteJornada(36, new Set())).toEqual({ jornada: 1, desde: '2026-09-14', disponible: true });
      expect(await ctrl.siguienteJornada(36, new Set([1]))).toEqual({ jornada: 2, desde: '2026-09-21', disponible: true });
    });

    it('una jornada de descanso, una semana después de la anterior', async () => {
      expect(await ctrl.siguienteJornada(36, new Set([1, 2]))).toEqual({ jornada: 3, desde: '2026-09-28', disponible: false });
    });

    it('null si ya están todas', async () => {
      expect(await ctrl.siguienteJornada(36, new Set([1, 2, 3, 4]))).toBeNull();
    });
  });

  it('listar: la fila del PALMA por jornada, la última tabla completa y la siguiente', async () => {
    Clasificacion.findAll.mockResolvedValue([
      { jornada: 1, fecha: '2026-09-13', ...equipo(1, 'UNO', { es_palma: false }) },
      { jornada: 1, fecha: '2026-09-13', ...equipo(2, 'PALMA DEL RIO ATLETICO C.F.', { es_palma: true }) }
    ]);
    const { promesa, res } = llamar(ctrl.listar, { query: { id_plantilla: '36' } });
    await promesa;
    expect(res._json.jornadas).toEqual([{
      jornada: 1, fecha: '2026-09-13', total_equipos: 2,
      palma: { posicion: 2, puntos: 8, jugados: 1, ganados: 1, empatados: 0, perdidos: 0, goles_favor: 2, goles_contra: 1 }
    }]);
    expect(res._json.ultima.equipos).toHaveLength(2);
    expect(res._json.siguiente).toEqual({ jornada: 2, desde: '2026-09-21', disponible: true });
  });

  it('guardar: rechaza una plantilla sin competición de RFAF', async () => {
    Plantilla.findByPk.mockResolvedValue({ id: 5, categoria: { nombre: 'Juvenil A' }, temporada: { actual: true } });
    const { promesa, res } = llamar(ctrl.guardarSiguiente, { body: { id_plantilla: 5 } });
    await promesa;
    expect(res._status).toBe(400);
    expect(leer).not.toHaveBeenCalled();
  });

  it('guardar: antes del día siguiente al partido no pide nada a RFAF (409)', async () => {
    Clasificacion.findAll.mockResolvedValue([{ jornada: 1 }, { jornada: 2 }]);
    const { promesa, res } = llamar(ctrl.guardarSiguiente, { body: { id_plantilla: 36 } });
    await promesa;
    expect(res._status).toBe(409);
    expect(res._json.message).toBe('La clasificación de la jornada 3 se podrá guardar a partir del 28/09/2026.');
    expect(leer).not.toHaveBeenCalled();
  });

  it('guardar: lee la siguiente jornada de RFAF y guarda todos los equipos marcando al PALMA', async () => {
    Clasificacion.findAll.mockResolvedValue([{ jornada: 1 }]);
    leer.mockResolvedValue({
      jornada: 2, fecha: '2026-09-20',
      equipos: [equipo(1, 'LA PALMA C.F.'), equipo(2, 'PALMA DEL RIO ATLETICO C.F.')]
    });
    const { promesa, res } = llamar(ctrl.guardarSiguiente, { body: { id_plantilla: 36 } });
    await promesa;
    expect(leer).toHaveBeenCalledWith(ctrl.COMPETICIONES_RFAF['Senior A'], 2);
    const filas = Clasificacion.bulkCreate.mock.calls[0][0];
    expect(filas.map((f) => [f.equipo, f.es_palma, f.jornada, f.id_plantilla, f.fecha])).toEqual([
      ['LA PALMA C.F.', false, 2, 36, '2026-09-20'],
      ['PALMA DEL RIO ATLETICO C.F.', true, 2, 36, '2026-09-20']
    ]);
    expect(res._status).toBe(201);
    expect(res._json).toEqual({ jornada: 2, posicion: 2, puntos: 8, total_equipos: 2 });
  });

  it('guardar: no guarda si RFAF devuelve otra jornada', async () => {
    Clasificacion.findAll.mockResolvedValue([]);
    leer.mockResolvedValue({ jornada: 5, fecha: '2026-10-11', equipos: [equipo(1, 'PALMA DEL RIO ATLETICO C.F.')] });
    const { promesa, res } = llamar(ctrl.guardarSiguiente, { body: { id_plantilla: 36 } });
    await promesa;
    expect(res._status).toBe(502);
    expect(Clasificacion.bulkCreate).not.toHaveBeenCalled();
  });

  it('guardar: no guarda si según RFAF la jornada aún no se ha jugado', async () => {
    Clasificacion.findAll.mockResolvedValue([{ jornada: 1 }]);
    leer.mockResolvedValue({ jornada: 2, fecha: '2026-09-21', equipos: [equipo(1, 'PALMA DEL RIO ATLETICO C.F.')] });
    const { promesa, res } = llamar(ctrl.guardarSiguiente, { body: { id_plantilla: 36 } });
    await promesa;
    expect(res._status).toBe(409);
    expect(Clasificacion.bulkCreate).not.toHaveBeenCalled();
  });

  it('guardar: no guarda si el PALMA no está en la clasificación', async () => {
    Clasificacion.findAll.mockResolvedValue([]);
    leer.mockResolvedValue({ jornada: 1, fecha: '2026-09-13', equipos: [equipo(1, 'LA PALMA C.F.')] });
    const { promesa, res } = llamar(ctrl.guardarSiguiente, { body: { id_plantilla: 36 } });
    await promesa;
    expect(res._status).toBe(502);
    expect(Clasificacion.bulkCreate).not.toHaveBeenCalled();
  });

  it('guardar: el error de RFAF (p. ej. sesión caducada) llega al usuario', async () => {
    Clasificacion.findAll.mockResolvedValue([]);
    leer.mockRejectedValue(Object.assign(new Error('RFAF ha devuelto la clasificación vacía'), { status: 502 }));
    const { promesa, res } = llamar(ctrl.guardarSiguiente, { body: { id_plantilla: 36 } });
    await promesa;
    expect(res._status).toBe(502);
    expect(res._json.message).toMatch('vacía');
  });
});
