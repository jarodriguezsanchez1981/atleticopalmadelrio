import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/index.js', () => ({
  partidosService: { actualizar: vi.fn().mockResolvedValue({}) }
}));

import { partidosService } from '../services/index.js';
import { moverEvento, puedeMoverEvento } from '../utils/moverEvento.js';

/** Evento como lo entrega FullCalendar en eventDrop (event / oldEvent). */
function evento(tipo, inicioOriginal, nuevoInicio, extra = {}) {
  const props = { tipo, base_id: 7, inicio: inicioOriginal, ...extra };
  return [
    { id: `${tipo}-7`, start: new Date(nuevoInicio), extendedProps: props },
    { id: `${tipo}-7`, start: new Date(inicioOriginal), extendedProps: props }
  ];
}

describe('moverEvento', () => {
  beforeEach(() => vi.clearAllMocks());

  it('partido con hora: guarda la nueva fecha con la misma hora', async () => {
    const [ev, viejo] = evento('partido', '2026-10-03T15:30:00.000Z', '2026-10-04T15:30:00.000Z');
    await moverEvento(ev, viejo);
    expect(partidosService.actualizar).toHaveBeenCalledWith(7, { fecha: '2026-10-04T15:30:00.000Z' });
  });

  it('partido sin hora: sigue a las 00:00 UTC aunque cambie el horario de verano', async () => {
    // 00:00 UTC del 24/10 se ve a las 02:00 en España; FullCalendar lo suelta
    // en el 26/10 a las 02:00 locales (que ya son 01:00 UTC, horario de invierno).
    const original = '2026-10-24T00:00:00.000Z';
    const ev = { id: 'partido-7', start: new Date(2026, 9, 26, 2, 0), extendedProps: { tipo: 'partido', base_id: 7, inicio: original } };
    const viejo = { id: 'partido-7', start: new Date(original) };
    await moverEvento(ev, viejo);
    const dias = Math.round((new Date(2026, 9, 26) - new Date(new Date(original).getFullYear(), new Date(original).getMonth(), new Date(original).getDate())) / 86400000);
    const esperado = new Date(original);
    esperado.setUTCDate(esperado.getUTCDate() + dias);
    expect(partidosService.actualizar).toHaveBeenCalledWith(7, { fecha: esperado.toISOString() });
    expect(partidosService.actualizar.mock.calls[0][1].fecha).toMatch(/T00:00:00.000Z$/);
  });

  it('entrenamientos, torneos y festivos no se pueden mover', async () => {
    for (const tipo of ['entrenamiento', 'torneo']) {
      const [ev, viejo] = evento(tipo, '2026-10-06T16:00:00.000Z', '2026-10-07T16:00:00.000Z');
      await expect(moverEvento(ev, viejo)).rejects.toThrow();
    }
    expect(partidosService.actualizar).not.toHaveBeenCalled();
  });

  it('festivos u otros eventos no se pueden mover', async () => {
    const [ev, viejo] = evento('festivo', '2026-10-12T00:00:00', '2026-10-13T00:00:00');
    await expect(moverEvento(ev, viejo)).rejects.toThrow();
  });
});

describe('puedeMoverEvento', () => {
  it('solo partidos, y con permiso de edición en Partidos', () => {
    const todo = { puedeEditar: () => true };
    expect(puedeMoverEvento({ tipo: 'partido' }, todo)).toBe(true);
    expect(puedeMoverEvento({ tipo: 'entrenamiento' }, todo)).toBe(false);
    expect(puedeMoverEvento({ tipo: 'torneo' }, todo)).toBe(false);
    expect(puedeMoverEvento({ tipo: 'festivo' }, todo)).toBe(false);
    expect(puedeMoverEvento({ tipo: 'partido' }, { puedeEditar: () => false })).toBe(false);
  });
});
