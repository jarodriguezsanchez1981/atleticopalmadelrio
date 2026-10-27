import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'module';
import { LigaPartido, LigaJugador, LigaGol, LigaTarjeta, Clasificacion, Plantilla } from './helpers/models.js';

import * as liga from '../src/controllers/liga.controller.js';

// Misma instancia CommonJS que usa el controlador, para poder espiar las lecturas de RFAF.
const rfafActa = createRequire(import.meta.url)('../src/utils/rfafActa.js');

const SENIOR_A = {
  id: 36, categoria: { nombre: 'Senior A' }, temporada: { actual: true },
  codigo_primaria: '1000120', codigo_grupo: '49641343', codigo_competicion: '48466530', codigo_temporada: '22'
};
const PALMA = 'PALMA DEL RIO ATLETICO C.F.';

/** Acta como la devuelve rfaf_acta.py (nombres inventados). */
const ACTA = {
  resultado: '2-1',
  local: {
    nombre: 'UNO C.F.',
    jugadores: [
      { dorsal: 9, nombre: 'GOLEADOR, ANA', foto: 'data:image/png;base64,xxx', titular: true, goles: 1, tarjeta_amarilla: 1, tarjeta_roja: 0, minuto_entrada: null, minuto_salida: 70 },
      { dorsal: 14, nombre: 'SUPLENTE, LUIS', titular: false, goles: 1, tarjeta_amarilla: 0, tarjeta_roja: 0, minuto_entrada: 70, minuto_salida: null }
    ],
    tarjetas: [{ nombre: 'GOLEADOR, ANA', tipo: 'amarilla', minuto: 40 }]
  },
  visitante: {
    nombre: 'DOS C.F.',
    jugadores: [{ dorsal: 5, nombre: 'DEFENSA, EVA', titular: true, goles: 0, tarjeta_amarilla: 0, tarjeta_roja: 1, minuto_entrada: null, minuto_salida: 80 }],
    tarjetas: [{ nombre: 'DEFENSA, EVA', tipo: 'roja', minuto: 80 }]
  },
  goles: [
    { minuto: 10, equipo: 'local', nombre: 'GOLEADOR, ANA', tipo: 'normal' },
    { minuto: 30, equipo: 'local', nombre: 'DEFENSA, EVA', tipo: 'propia' },
    { minuto: 75, equipo: 'local', nombre: 'SUPLENTE, LUIS', tipo: 'penalti' }
  ]
};

describe('Liga (actas de toda la liga) · liga.controller', () => {
  beforeEach(() => {
    for (const m of [LigaPartido, LigaJugador, LigaGol, LigaTarjeta, Clasificacion, Plantilla]) {
      for (const f of Object.values(m)) f.mockReset?.();
    }
  });

  describe('guardarActa', () => {
    it('guarda jugadores (sin foto) con minutos, goles con quién y tarjetas con el marcador de su equipo', async () => {
      await liga.guardarActa({ id: 7 }, ACTA);

      expect(LigaJugador.destroy).toHaveBeenCalledWith({ where: { id_liga_partido: 7 } });
      const jugadores = LigaJugador.bulkCreate.mock.calls[0][0];
      expect(jugadores[0]).toEqual({
        id_liga_partido: 7, lado: 'local', dorsal: 9, nombre: 'GOLEADOR, ANA', titular: true,
        minuto_entrada: null, minuto_salida: 70, minutos: 70, goles: 1, amarillas: 1, rojas: 0
      });
      expect(jugadores[1].minutos).toBe(20);
      expect(jugadores.some((j) => 'foto' in j)).toBe(false);

      expect(LigaGol.bulkCreate).toHaveBeenCalledWith([
        { id_liga_partido: 7, lado: 'local', nombre: 'GOLEADOR, ANA', minuto: 10, tipo: 'normal', titular: true },
        { id_liga_partido: 7, lado: 'local', nombre: 'DEFENSA, EVA', minuto: 30, tipo: 'propia', titular: null },
        { id_liga_partido: 7, lado: 'local', nombre: 'SUPLENTE, LUIS', minuto: 75, tipo: 'penalti', titular: false }
      ]);
      // Al 80 iba 3-0 para el local: la roja del visitante es "perdiendo".
      expect(LigaTarjeta.bulkCreate).toHaveBeenCalledWith([
        { id_liga_partido: 7, lado: 'local', nombre: 'GOLEADOR, ANA', tipo: 'amarilla', minuto: 40, titular: true, goles_favor: 2, goles_contra: 0 },
        { id_liga_partido: 7, lado: 'visitante', nombre: 'DEFENSA, EVA', tipo: 'roja', minuto: 80, titular: true, goles_favor: 0, goles_contra: 3 }
      ]);
      expect(LigaPartido.update).toHaveBeenCalledWith(
        expect.objectContaining({ goles_local: 2, goles_visitante: 1, acta_at: expect.any(Date) }), { where: { id: 7 } });
    });
  });

  describe('guardarActaDelPalma (desde Finalizar Acta)', () => {
    it('guarda el partido de liga de Senior A sin pedir nada a RFAF', async () => {
      LigaPartido.findOrCreate.mockResolvedValue([{ id: 3 }, true]);
      const leer = vi.spyOn(rfafActa, 'leerActa');
      await liga.guardarActaDelPalma({
        partido: { id_plantilla: 36, jornada: 8, fecha: new Date('2026-10-25T17:00:00Z') },
        plantilla: { categoria: { nombre: 'Senior A' } }, codigoActa: '2734061', acta: ACTA
      });
      expect(LigaPartido.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({
        where: { id_plantilla: 36, codigo_acta: '2734061' },
        defaults: expect.objectContaining({ jornada: 8, fecha: '2026-10-25', equipo_local: 'UNO C.F.', equipo_visitante: 'DOS C.F.' })
      }));
      expect(LigaJugador.bulkCreate).toHaveBeenCalled();
      expect(leer).not.toHaveBeenCalled();
      leer.mockRestore();
    });

    it('no guarda nada de otras categorías (menores) ni de partidos sin jornada', async () => {
      await liga.guardarActaDelPalma({ partido: { id_plantilla: 5, jornada: 3 }, plantilla: { categoria: { nombre: 'Infantil B' } }, codigoActa: '1', acta: ACTA });
      await liga.guardarActaDelPalma({ partido: { id_plantilla: 36, jornada: 0 }, plantilla: { categoria: { nombre: 'Senior A' } }, codigoActa: '1', acta: ACTA });
      expect(LigaPartido.findOrCreate).not.toHaveBeenCalled();
    });
  });

  describe('actualizar (copia diaria)', () => {
    const log = { log: vi.fn(), warn: vi.fn() };
    const pausa = vi.fn(async () => {});
    let leerJornada;
    let leerActa;
    beforeEach(() => {
      log.log.mockReset();
      log.warn.mockReset();
      pausa.mockReset();
      Plantilla.findOne.mockResolvedValue(SENIOR_A);
      leerJornada = vi.spyOn(rfafActa, 'leerJornada');
      leerJornada.mockReset();
      leerActa = vi.spyOn(rfafActa, 'leerActa');
      leerActa.mockReset();
    });
    afterEach(() => { leerJornada.mockRestore(); leerActa.mockRestore(); });

    const pendiente = (id, local, visitante, extra = {}) => ({ id, jornada: 1, codigo_acta: String(1000 + id), equipo_local: local, equipo_visitante: visitante, intentos: 0, ...extra });

    it('sin plantilla de Senior A con sus códigos no pide nada', async () => {
      Plantilla.findOne.mockResolvedValue(null);
      expect(await liga.actualizar({ log, pausa })).toEqual({ jornadas: [], actas: 0 });
      expect(leerJornada).not.toHaveBeenCalled();
    });

    it('copia como mucho 2 jornadas jugadas que falten y luego las actas pendientes, sin la del PALMA, con pausa entre peticiones', async () => {
      Clasificacion.findAll.mockResolvedValue([{ jornada: 1 }, { jornada: 2 }, { jornada: 3 }, { jornada: 4 }]);
      // La 1 ya está copiada; la 2 solo tiene el partido del PALMA (sin códigos), así que falta.
      LigaPartido.findAll
        .mockResolvedValueOnce([{ jornada: 1 }])
        .mockResolvedValueOnce([
          pendiente(1, 'UNO C.F.', 'DOS C.F.'),
          pendiente(2, PALMA, 'TRES C.F.')
        ]);
      leerJornada.mockImplementation(async (_c, jornada) => ({ jornada, partidos: [{ codigo_acta: `j${jornada}`, equipo_local: 'A', equipo_visitante: 'B' }] }));
      leerActa.mockResolvedValue(ACTA);

      const r = await liga.actualizar({ log, pausa, pausaMs: 1 });

      expect(leerJornada.mock.calls.map((c) => c[1])).toEqual([2, 3]);
      expect(leerJornada.mock.calls[0][0]).toEqual({ codPrimaria: '1000120', codGrupo: '49641343', codCompeticion: '48466530', codTemporada: '22' });
      expect(LigaPartido.bulkCreate.mock.calls[0][0]).toEqual([{ codigo_acta: 'j2', equipo_local: 'A', equipo_visitante: 'B', id_plantilla: 36, jornada: 2 }]);
      expect(leerActa).toHaveBeenCalledTimes(1);
      expect(leerActa).toHaveBeenCalledWith('1000120', '1001');
      expect(r).toEqual({ jornadas: [2, 3], actas: 1 });
      // 3 peticiones: 2 pausas (ninguna antes de la primera).
      expect(pausa).toHaveBeenCalledTimes(2);
    });

    it('un acta sin jugadores (partido aplazado) suma un intento y sigue con la siguiente', async () => {
      Clasificacion.findAll.mockResolvedValue([]);
      LigaPartido.findAll.mockResolvedValueOnce([]).mockResolvedValueOnce([
        pendiente(1, 'UNO C.F.', 'DOS C.F.', { intentos: 1 }),
        pendiente(2, 'TRES C.F.', 'CUATRO C.F.')
      ]);
      leerActa.mockResolvedValueOnce({ local: { jugadores: [] }, visitante: { jugadores: [] } }).mockResolvedValueOnce(ACTA);

      const r = await liga.actualizar({ log, pausa });
      expect(LigaPartido.update).toHaveBeenCalledWith({ intentos: 2 }, { where: { id: 1 } });
      expect(r.actas).toBe(1);
    });

    it('al primer error de RFAF se para; si es la sesión, no cuenta como intento', async () => {
      Clasificacion.findAll.mockResolvedValue([]);
      LigaPartido.findAll.mockResolvedValueOnce([]).mockResolvedValueOnce([
        pendiente(1, 'UNO C.F.', 'DOS C.F.'),
        pendiente(2, 'TRES C.F.', 'CUATRO C.F.')
      ]);
      leerActa.mockRejectedValue(new Error('RFAF ha devuelto el acta vacía: la sesión de RFAF no es válida'));

      const r = await liga.actualizar({ log, pausa });
      expect(leerActa).toHaveBeenCalledTimes(1);
      expect(LigaPartido.update).not.toHaveBeenCalled();
      expect(r.actas).toBe(0);
      expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('sesión'));
    });
  });

  describe('recuperación cada 30 minutos', () => {
    const log = { log: vi.fn(), warn: vi.fn() };
    const req = createRequire(import.meta.url);
    const ligaCjs = req('../src/controllers/liga.controller.js');
    const recuperacion = req('../src/utils/ligaRecuperacion.js');
    let leerActa;
    beforeEach(() => {
      log.log.mockReset();
      log.warn.mockReset();
      Plantilla.findOne.mockResolvedValue(SENIOR_A);
      leerActa = vi.spyOn(rfafActa, 'leerActa');
      leerActa.mockReset();
    });
    afterEach(() => { leerActa.mockRestore(); vi.restoreAllMocks(); });

    it('soloNuevas: solo pide las actas que nunca se han pedido', async () => {
      Clasificacion.findAll.mockResolvedValue([]);
      LigaPartido.findAll.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      await liga.actualizar({ log, pausa: async () => {}, soloNuevas: true });
      expect(LigaPartido.findAll.mock.calls[1][0].where.intentos).toBe(0);
    });

    it('hayPendientes: true si queda una jornada jugada sin copiar o un acta nueva', async () => {
      Clasificacion.findAll.mockResolvedValue([{ jornada: 1 }, { jornada: 2 }]);
      LigaPartido.findAll.mockResolvedValueOnce([{ jornada: 1 }, { jornada: 2 }]).mockResolvedValueOnce([]);
      expect(await liga.hayPendientes()).toBe(false);
      LigaPartido.findAll.mockResolvedValueOnce([{ jornada: 1 }]);
      expect(await liga.hayPendientes()).toBe(true);
      LigaPartido.findAll.mockResolvedValueOnce([{ jornada: 1 }, { jornada: 2 }])
        .mockResolvedValueOnce([{ id: 1, equipo_local: 'UNO', equipo_visitante: 'DOS' }]);
      expect(await liga.hayPendientes()).toBe(true);
      // La del PALMA no cuenta (la guarda Finalizar Acta).
      LigaPartido.findAll.mockResolvedValueOnce([{ jornada: 1 }, { jornada: 2 }])
        .mockResolvedValueOnce([{ id: 2, equipo_local: PALMA, equipo_visitante: 'DOS' }]);
      expect(await liga.hayPendientes()).toBe(false);
    });

    it('al ponerse al día no copia nada más', async () => {
      vi.spyOn(ligaCjs, 'hayPendientes').mockResolvedValue(false);
      const actualizar = vi.spyOn(ligaCjs, 'actualizar');
      await recuperacion.siguiente(log);
      expect(actualizar).not.toHaveBeenCalled();
      expect(log.log).toHaveBeenCalledWith(expect.stringContaining('al día'));
    });

    it('tras un fallo: reintenta salvo sesión caducada, y como mucho 3 seguidos', () => {
      const prev = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const timeout = vi.spyOn(global, 'setTimeout').mockImplementation(() => ({ unref() {} }));
      try {
        expect(recuperacion.trasCopia({ error: 'RFAF ha devuelto la jornada vacía: la sesión de RFAF no es válida' }, log)).toBe(false);
        expect(recuperacion.trasCopia({ error: 'timeout' }, log)).toBe(true);
        // Ya hay una programada: no se duplica.
        expect(recuperacion.trasCopia({ error: 'timeout' }, log)).toBe(false);
        expect(timeout).toHaveBeenCalledTimes(1);
      } finally {
        timeout.mockRestore();
        process.env.NODE_ENV = prev;
      }
    });

    it('si quedan, copia solo las nuevas; si RFAF falla, se para', async () => {
      vi.spyOn(ligaCjs, 'hayPendientes').mockResolvedValue(true);
      const actualizar = vi.spyOn(ligaCjs, 'actualizar').mockResolvedValue({ jornadas: [], actas: 0, error: 'sesión caducada' });
      await recuperacion.siguiente(log);
      expect(actualizar).toHaveBeenCalledWith(expect.objectContaining({ soloNuevas: true }));
    });
  });
});
