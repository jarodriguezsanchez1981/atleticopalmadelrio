import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Sancion, PartidoTarjeta } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/sancion.controller.js';

describe('Sección Sanciones · sancion.controller', () => {
  beforeEach(() => {
    Sancion.findAll.mockReset();
    PartidoTarjeta.findAll.mockReset();
    Sancion.findByPk.mockReset();
    Sancion.create.mockReset();
    Sancion.destroy.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve las sanciones', async () => {
    Sancion.findAll.mockResolvedValue([{ id: 1, amarilla: 1 }]);
    const { promesa, res } = llamar(ctrl.listar);
    await promesa;
    expect(res._json).toHaveLength(1);
  });

  it('listar añade los minutos de las tarjetas del jugador en el partido', async () => {
    Sancion.findAll.mockResolvedValue([{ id: 1, id_partido: 5, id_jugador: 9, amarilla: 2, roja: 1 }, { id: 2, id_partido: 6, id_jugador: 9, amarilla: 1, roja: 0 }]);
    PartidoTarjeta.findAll.mockResolvedValue([
      { id_partido: 5, id_jugador: 9, tipo: 'amarilla', minuto: 70 },
      { id_partido: 5, id_jugador: 9, tipo: 'amarilla', minuto: 12 },
      { id_partido: 5, id_jugador: 9, tipo: 'roja', minuto: 70 },
      { id_partido: 5, id_jugador: 3, tipo: 'amarilla', minuto: 40 }
    ]);
    const { promesa, res } = llamar(ctrl.listar);
    await promesa;
    expect(PartidoTarjeta.findAll.mock.calls[0][0].where).toEqual({ id_partido: [5, 6] });
    expect(res._json[0]).toMatchObject({ id: 1, minutos_amarilla: [12, 70], minutos_roja: [70] });
    expect(res._json[1]).toMatchObject({ id: 2, minutos_amarilla: [], minutos_roja: [] });
  });

  it('listar filtra por partido y jugador', async () => {
    Sancion.findAll.mockResolvedValue([]);
    const { promesa } = llamar(ctrl.listar, { query: { id_partido: '5', id_jugador: '9' } });
    await promesa;
    const where = Sancion.findAll.mock.calls[0][0].where;
    expect(where).toMatchObject({ id_partido: '5', id_jugador: '9' });
  });

  it('obtener devuelve 404 si no existe', async () => {
    Sancion.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });
    await promesa;
    expect(res._status).toBe(404);
  });

  it('crear valida campos obligatorios', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { id_partido: 1 } });
    await promesa;
    expect(res._status).toBe(400);
    expect(Sancion.create).not.toHaveBeenCalled();
  });

  it('crear crea la sanción con valores por defecto', async () => {
    Sancion.create.mockResolvedValue({ id: 1 });
    Sancion.findByPk.mockResolvedValue({ id: 1, amarilla: 0, roja: 0 });
    const { promesa, res } = llamar(ctrl.crear, {
      body: { id_partido: 2, id_jugador: 3 }
    });
    await promesa;
    expect(Sancion.create).toHaveBeenCalledWith({ id_partido: 2, id_jugador: 3, amarilla: 0, roja: 0 });
    expect(res._status).toBe(201);
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Sancion.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '99' }, body: {} });
    await promesa;
    expect(res._status).toBe(404);
  });

  it('actualizar guarda los cambios', async () => {
    const registro = { id: 1, save: vi.fn().mockResolvedValue() };
    Sancion.findByPk.mockResolvedValue(registro);
    Sancion.findByPk.mockResolvedValueOnce(registro);
    Sancion.findByPk.mockResolvedValueOnce({ id: 1, amarilla: 2 });
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { amarilla: 2 }
    });
    await promesa;
    expect(registro.amarilla).toBe(2);
    expect(registro.save).toHaveBeenCalled();
  });

  it('eliminar responde 204', async () => {
    Sancion.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });
    await promesa;
    expect(res._status).toBe(204);
  });
});
