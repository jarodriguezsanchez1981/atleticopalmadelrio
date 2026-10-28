import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'module';
import { Clasificacion, Partido, Plantilla, LigaPartido } from './helpers/models.js';
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
const SENIOR_A = {
  id: 36, categoria: { nombre: 'Senior A' }, temporada: { actual: true },
  codigo_primaria: '1000120', codigo_grupo: '49641343', codigo_competicion: '48466530'
};
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
    LigaPartido.findAll.mockReset();
    LigaPartido.findAll.mockResolvedValue([]);
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

  describe('esPalma', () => {
    it('reconoce al PALMA en cualquier orden y no confunde a "LA PALMA C.F."', () => {
      expect(ctrl.esPalma('PALMA DEL RIO ATLETICO C.F.')).toBe(true);
      expect(ctrl.esPalma('ATLETICO PALMA DEL RIO C.F.')).toBe(true);   // RFAF lo escribe así en algunas competiciones
      expect(ctrl.esPalma('Atlético Palma del Río C.F.')).toBe(true);   // con tildes y minúsculas
      expect(ctrl.esPalma('LA PALMA C.F.')).toBe(false);
      expect(ctrl.esPalma('C.D. SANTAELLA 2010')).toBe(false);
    });
  });

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

  it('listar: últimos resultados (G/E/P) de cada equipo, de cómo cambian de una jornada a otra; descansar no cuenta', async () => {
    const fila = (jornada, nombre, ganados, empatados, perdidos) => ({
      jornada, fecha: null, posicion: 1, equipo: nombre, codigo_equipo: null, es_palma: false,
      jugados: ganados + empatados + perdidos, ganados, empatados, perdidos
    });
    Clasificacion.findAll.mockResolvedValue([
      fila(1, 'UNO', 1, 0, 0), fila(1, 'DOS', 0, 0, 1),
      fila(2, 'UNO', 1, 1, 0), fila(2, 'DOS', 0, 0, 1), // DOS descansa
      fila(3, 'UNO', 1, 1, 1), fila(3, 'DOS', 1, 0, 1),
      fila(4, 'UNO', 2, 1, 1), fila(4, 'DOS', 1, 1, 1),
      fila(5, 'UNO', 3, 1, 1), fila(5, 'DOS', 1, 1, 2),
      fila(6, 'UNO', 3, 2, 1), fila(6, 'DOS', 2, 1, 2)
    ]);
    const { promesa, res } = llamar(ctrl.listar, { query: { id_plantilla: '36' } });
    await promesa;
    const porEquipo = Object.fromEntries(res._json.ultima.equipos.map((e) => [e.equipo, e.ultimos.map((u) => u.resultado).join('')]));
    // UNO: G E P G G E -> los 5 últimos.
    expect(porEquipo.UNO).toBe('EPGGE');
    expect(porEquipo.DOS).toBe('PGEPG');
    expect(res._json.ultima.equipos[0].ultimos.at(-1)).toEqual({ jornada: 6, resultado: 'E' });
  });

  it('listar: cada último resultado lleva su partido (liga_partidos y, para el PALMA, sus partidos)', async () => {
    const fila = (jornada, nombre, codigo, ganados, empatados, perdidos, es_palma = false) => ({
      jornada, fecha: null, posicion: 1, equipo: nombre, codigo_equipo: codigo, es_palma,
      jugados: ganados + empatados + perdidos, ganados, empatados, perdidos
    });
    Clasificacion.findAll.mockResolvedValue([
      fila(1, 'UNO', '11', 1, 0, 0), fila(1, 'PALMA DEL RIO ATLETICO C.F.', '73', 0, 1, 0, true),
      fila(2, 'UNO', '11', 1, 1, 0), fila(2, 'PALMA DEL RIO ATLETICO C.F.', '73', 1, 1, 0, true)
    ]);
    LigaPartido.findAll.mockResolvedValue([
      { jornada: 1, equipo_local: 'UNO', codigo_equipo_local: '11', equipo_visitante: 'DOS', codigo_equipo_visitante: '12', goles_local: 3, goles_visitante: 0 },
      { jornada: 2, equipo_local: 'TRES', codigo_equipo_local: '13', equipo_visitante: 'UNO', codigo_equipo_visitante: '11', goles_local: null, goles_visitante: null }
    ]);
    // Al PALMA no lo trae liga_partidos: sale de sus partidos (el 2 sin resultado).
    Partido.findAll.mockImplementation(async (opts) => (opts?.include ? [
      { jornada: 1, resultado: '1-1', equipoLocal: { nombre: 'PALMA DEL RIO ATLETICO C.F.' }, equipoVisitante: { nombre: 'CUATRO' } },
      { jornada: 2, resultado: '0-2', equipoLocal: { nombre: 'CINCO' }, equipoVisitante: { nombre: 'PALMA DEL RIO ATLETICO C.F.' } }
    ] : PARTIDOS));
    const { promesa, res } = llamar(ctrl.listar, { query: { id_plantilla: '36' } });
    await promesa;
    const [uno, palma] = res._json.ultima.equipos;
    expect(uno.ultimos).toEqual([
      { jornada: 1, resultado: 'G', partido: 'UNO 3 - 0 DOS' },
      { jornada: 2, resultado: 'E', partido: 'TRES - UNO' }
    ]);
    expect(palma.ultimos).toEqual([
      { jornada: 1, resultado: 'E', partido: 'PALMA DEL RIO ATLETICO C.F. 1 - 1 CUATRO' },
      { jornada: 2, resultado: 'G', partido: 'CINCO 0 - 2 PALMA DEL RIO ATLETICO C.F.' }
    ]);
  });

  it('siguienteJornada: el día siguiente al partido, solo desde las 10:00', async () => {
    vi.setSystemTime(new Date('2026-09-21T07:59:00Z')); // 09:59 en España
    expect(await ctrl.siguienteJornada(36, new Set([1]))).toEqual({ jornada: 2, desde: '2026-09-21', disponible: false });
  });

  it('guardar: rechaza una plantilla sin competición de RFAF', async () => {
    await expect(ctrl.guardarSiguiente({ id: 5, categoria: { nombre: 'Juvenil A' } })).rejects.toThrow('no tiene configurada');
    expect(leer).not.toHaveBeenCalled();
  });

  it('guardar: antes del día siguiente al partido no pide nada a RFAF', async () => {
    Clasificacion.findAll.mockResolvedValue([{ jornada: 1 }, { jornada: 2 }]);
    expect(await ctrl.guardarSiguiente(SENIOR_A)).toBeNull();
    expect(leer).not.toHaveBeenCalled();
  });

  it('guardar: lee la siguiente jornada de RFAF y guarda todos los equipos marcando al PALMA', async () => {
    Clasificacion.findAll.mockResolvedValue([{ jornada: 1 }]);
    leer.mockResolvedValue({
      jornada: 2, fecha: '2026-09-20',
      equipos: [equipo(1, 'LA PALMA C.F.'), equipo(2, 'PALMA DEL RIO ATLETICO C.F.')]
    });
    const r = await ctrl.guardarSiguiente(SENIOR_A);
    expect(leer).toHaveBeenCalledWith({ codPrimaria: '1000120', codGrupo: '49641343', codCompeticion: '48466530' }, 2);
    const filas = Clasificacion.bulkCreate.mock.calls[0][0];
    expect(filas.map((f) => [f.equipo, f.es_palma, f.jornada, f.id_plantilla, f.fecha])).toEqual([
      ['LA PALMA C.F.', false, 2, 36, '2026-09-20'],
      ['PALMA DEL RIO ATLETICO C.F.', true, 2, 36, '2026-09-20']
    ]);
    expect(r).toEqual({ jornada: 2, posicion: 2, puntos: 8, total_equipos: 2 });
  });

  it('guardar: usa los códigos de RFAF de la propia plantilla (no los de Senior A)', async () => {
    const benjaminA = {
      id: 26, categoria: { nombre: 'Benjamin A' }, temporada: { actual: true },
      codigo_primaria: '1000120', codigo_grupo: '48466134', codigo_competicion: '48466133'
    };
    Clasificacion.findAll.mockResolvedValue([{ jornada: 1 }]);
    leer.mockResolvedValue({ jornada: 2, fecha: '2026-09-20', equipos: [equipo(1, 'PALMA DEL RIO ATLETICO C.F.')] });
    await ctrl.guardarSiguiente(benjaminA);
    expect(leer).toHaveBeenCalledWith({ codPrimaria: '1000120', codGrupo: '48466134', codCompeticion: '48466133' }, 2);
  });

  it('guardar: no guarda si RFAF devuelve otra jornada', async () => {
    Clasificacion.findAll.mockResolvedValue([]);
    leer.mockResolvedValue({ jornada: 5, fecha: '2026-10-11', equipos: [equipo(1, 'PALMA DEL RIO ATLETICO C.F.')] });
    await expect(ctrl.guardarSiguiente(SENIOR_A)).rejects.toThrow('jornada 5 en lugar de la 1');
    expect(Clasificacion.bulkCreate).not.toHaveBeenCalled();
  });

  it('guardar: no guarda si según RFAF la jornada aún no se ha jugado', async () => {
    Clasificacion.findAll.mockResolvedValue([{ jornada: 1 }]);
    leer.mockResolvedValue({ jornada: 2, fecha: '2026-09-21', equipos: [equipo(1, 'PALMA DEL RIO ATLETICO C.F.')] });
    await expect(ctrl.guardarSiguiente(SENIOR_A)).rejects.toThrow('se juega el 21/09/2026');
    expect(Clasificacion.bulkCreate).not.toHaveBeenCalled();
  });

  it('guardar: no guarda si el PALMA no está en la clasificación', async () => {
    Clasificacion.findAll.mockResolvedValue([]);
    leer.mockResolvedValue({ jornada: 1, fecha: '2026-09-13', equipos: [equipo(1, 'LA PALMA C.F.')] });
    await expect(ctrl.guardarSiguiente(SENIOR_A)).rejects.toThrow('no aparece');
    expect(Clasificacion.bulkCreate).not.toHaveBeenCalled();
  });

  describe('actualizarTodas', () => {
    const log = { log: vi.fn(), warn: vi.fn() };
    beforeEach(() => { log.log.mockReset(); log.warn.mockReset(); Plantilla.findAll.mockReset(); });

    it('guarda una tras otra las jornadas ya disponibles (una petición por jornada)', async () => {
      Plantilla.findAll.mockResolvedValue([SENIOR_A]);
      const guardadas = [];
      Clasificacion.findAll.mockImplementation(async () => guardadas.map((jornada) => ({ jornada })));
      Clasificacion.bulkCreate.mockImplementation(async (filas) => { guardadas.push(filas[0].jornada); });
      leer.mockImplementation(async (_c, jornada) => ({
        jornada, fecha: PARTIDOS[jornada - 1].fecha.toISOString().slice(0, 10), equipos: [equipo(3, 'PALMA DEL RIO ATLETICO C.F.')]
      }));
      const r = await ctrl.actualizarTodas(log);
      expect(r.map((g) => g.jornada)).toEqual([1, 2]);
      expect(leer).toHaveBeenCalledTimes(2);
      expect(log.warn).not.toHaveBeenCalled();
    });

    it('al primer error de RFAF se para y lo deja en el log', async () => {
      Plantilla.findAll.mockResolvedValue([SENIOR_A]);
      Clasificacion.findAll.mockResolvedValue([]);
      leer.mockRejectedValue(Object.assign(new Error('RFAF ha devuelto la clasificación vacía'), { status: 502 }));
      expect(await ctrl.actualizarTodas(log)).toEqual([]);
      expect(leer).toHaveBeenCalledTimes(1);
      expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('vacía'));
    });
  });
});

describe('clasificacionAutomatica · proximaEjecucion', () => {
  const { proximaEjecucion } = createRequire(import.meta.url)('../src/utils/clasificacionAutomatica.js');
  it('las 12:00 españolas de hoy, o de mañana si ya han pasado', () => {
    expect(proximaEjecucion(12, new Date('2026-09-21T08:00:00Z')).toISOString()).toBe('2026-09-21T10:00:00.000Z');
    expect(proximaEjecucion(12, new Date('2026-09-21T10:00:01Z')).toISOString()).toBe('2026-09-22T10:00:00.000Z');
    // Tras el cambio de hora (invierno, UTC+1).
    expect(proximaEjecucion(12, new Date('2026-10-25T12:00:00Z')).toISOString()).toBe('2026-10-26T11:00:00.000Z');
  });
});
