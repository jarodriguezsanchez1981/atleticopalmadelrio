import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';
import { TareaEjecucion, InformeSeguridad, Partido } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/tareas.controller.js';
import * as tareas from '../src/utils/tareasAutomaticas.js';

const require = createRequire(import.meta.url);
const avisoSesion = require('../src/utils/avisoSesionRfaf.js');

const consola = { log: vi.fn(), warn: vi.fn() };

describe('Tareas automáticas · registro de ejecuciones', () => {
  beforeEach(() => {
    for (const f of Object.values(TareaEjecucion)) f.mockReset?.();
  });

  it('guarda la ejecución con sus mensajes y borra las de hace más de 90 días', async () => {
    const r = await tareas.ejecutar('horarios', async (log) => {
      log.log('🕒 Horarios: 3 jornadas comprobadas, 0 cambiadas, 0 errores.');
      return { comprobados: 3 };
    }, { consola });

    expect(r).toEqual({ comprobados: 3 });
    expect(TareaEjecucion.create).toHaveBeenCalledWith(expect.objectContaining({
      tarea: 'horarios', estado: 'ok', resumen: '🕒 Horarios: 3 jornadas comprobadas, 0 cambiadas, 0 errores.'
    }));
    expect(TareaEjecucion.destroy).toHaveBeenCalled();
    expect(consola.log).toHaveBeenCalled();
  });

  it('estado: avisos, sesión de RFAF caducada o error', async () => {
    await tareas.ejecutar('liga', async (log) => { log.warn('⚠️  Liga Senior A: timeout'); }, { consola });
    expect(TareaEjecucion.create.mock.calls[0][0].estado).toBe('avisos');

    await tareas.ejecutar('liga', async (log) => { log.warn('⚠️  La sesión de RFAF no es válida'); }, { consola });
    expect(TareaEjecucion.create.mock.calls[1][0].estado).toBe('sesion');

    await expect(tareas.ejecutar('liga', async () => { throw new Error('fallo BD'); }, { consola })).rejects.toThrow('fallo BD');
    expect(TareaEjecucion.create.mock.calls[2][0]).toMatchObject({ estado: 'error', resumen: '❌ fallo BD' });
  });

  it('con soloConNovedades no guarda una ejecución sin mensajes', async () => {
    await tareas.ejecutar('acta', async () => ({}), { soloConNovedades: true, consola });
    expect(TareaEjecucion.create).not.toHaveBeenCalled();
  });

  it('si no se puede guardar, la tarea sigue', async () => {
    TareaEjecucion.create.mockRejectedValue(new Error('sin BD'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(tareas.ejecutar('informes', async () => 'hecho', { consola })).resolves.toBe('hecho');
    warn.mockRestore();
  });
});

describe('Tareas automáticas · tareas.controller', () => {
  beforeEach(() => {
    for (const m of [TareaEjecucion, InformeSeguridad, Partido]) for (const f of Object.values(m)) f.mockReset?.();
    Partido.findAll.mockResolvedValue([]);
  });

  it('devuelve cada tarea con su próxima ejecución, la última, los parches y la sesión de RFAF', async () => {
    const ultima = { tarea: 'horarios', inicio: new Date(), estado: 'ok', resumen: 'bien' };
    TareaEjecucion.findOne.mockImplementation(async ({ where }) => (where.tarea === 'horarios' ? ultima : null));
    TareaEjecucion.findAll.mockResolvedValue([ultima]);
    InformeSeguridad.findOne.mockResolvedValue({ fecha: new Date(), hay_actualizaciones: false, hay_vulnerabilidades: true, total_high: 2, total_critical: 0 });
    avisoSesion.sesionValida();
    const { req, res } = mockReqRes();
    const next = vi.fn();

    await ctrl.estado(req, res, next);

    expect(next).not.toHaveBeenCalled();
    const { tareas: lista, sesion_rfaf, ejecuciones } = res._json;
    expect(lista.map((t) => t.clave)).toEqual(['clasificacion', 'liga', 'informes', 'horarios', 'acta', 'copias', 'parches']);
    expect(lista.find((t) => t.clave === 'copias').proxima.fecha).toEqual(expect.any(Date));
    expect(lista.find((t) => t.clave === 'horarios')).toMatchObject({ ultima, proxima: { fecha: expect.any(Date) } });
    expect(lista.find((t) => t.clave === 'acta').proxima).toBeNull();
    expect(lista.find((t) => t.clave === 'parches').ultima).toMatchObject({ estado: 'avisos', resumen: expect.stringContaining('2 HIGH') });
    expect(sesion_rfaf).toMatchObject({ ultima_valida: expect.any(Date), caducada_desde: null, acta_parada: false });
    expect(ejecuciones).toEqual([ultima]);
    expect(TareaEjecucion.findAll.mock.calls[0][0].limit).toBe(100);
  });

  it('propaga el error a next', async () => {
    TareaEjecucion.findOne.mockRejectedValue(new Error('fallo BD'));
    const { req, res } = mockReqRes();
    const next = vi.fn();
    await ctrl.estado(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('Tareas automáticas · próxima copia de seguridad', () => {
  it('a las 03:00 UTC de hoy si aún no ha pasado y, si no, de mañana', () => {
    expect(ctrl.proximaCopia(new Date('2026-11-07T02:59:00Z'))).toEqual(new Date('2026-11-07T03:00:00Z'));
    expect(ctrl.proximaCopia(new Date('2026-11-07T03:00:00Z'))).toEqual(new Date('2026-11-08T03:00:00Z'));
    expect(ctrl.proximaCopia(new Date('2026-12-31T13:00:00Z'))).toEqual(new Date('2027-01-01T03:00:00Z'));
  });
});
