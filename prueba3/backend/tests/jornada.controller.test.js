import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Jornada, Plantilla, Equipo, Partido } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/jornada.controller.js';

describe('Sección Jornadas · jornada.controller', () => {
  beforeEach(() => {
    Jornada.findAll.mockReset();
    Jornada.findOne.mockReset();
    Jornada.create.mockReset();
    Jornada.destroy.mockReset();
    Plantilla.findOne.mockReset();
    Equipo.findOne.mockReset();
    Partido.create.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve las jornadas filtradas', async () => {
    Jornada.findAll.mockResolvedValue([{ id: 1, jornada: 1 }]);
    const { promesa, res } = llamar(ctrl.listar, { query: { id_plantilla: '2' } });
    await promesa;
    expect(res._json).toHaveLength(1);
    const where = Jornada.findAll.mock.calls[0][0].where;
    expect(where).toMatchObject({ id_plantilla: '2' });
  });

  it('obtener devuelve 404 si no existe', async () => {
    Jornada.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });
    await promesa;
    expect(res._status).toBe(404);
  });

  it('crear valida campos obligatorios', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { id_plantilla: 1 } });
    await promesa;
    expect(res._status).toBe(400);
    expect(Jornada.create).not.toHaveBeenCalled();
  });

  it('crear rechaza equipos iguales', async () => {
    const { promesa, res } = llamar(ctrl.crear, {
      body: { id_plantilla: 1, id_equipo_local: 5, id_equipo_visitante: 5, jornada: 1, fecha: '2026-01-01' }
    });
    await promesa;
    expect(res._status).toBe(400);
  });

  it('crear rechaza plantilla inexistente', async () => {
    Plantilla.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { id_plantilla: 1, id_equipo_local: 2, id_equipo_visitante: 3, jornada: 1, fecha: '2026-01-01' }
    });
    await promesa;
    expect(res._status).toBe(400);
  });

  it('crear rechaza jornada no positiva', async () => {
    Plantilla.findOne.mockResolvedValue({ id: 1, id_categoria: 7 });
    Equipo.findOne.mockResolvedValue({ id: 2 });
    const { promesa, res } = llamar(ctrl.crear, {
      body: { id_plantilla: 1, id_equipo_local: 2, id_equipo_visitante: 3, jornada: 0, fecha: '2026-01-01' }
    });
    await promesa;
    expect(res._status).toBe(400);
  });

  it('crea jornada y sus dos partidos', async () => {
    Plantilla.findOne.mockResolvedValue({ id: 1, id_categoria: 7 });
    Equipo.findOne.mockResolvedValue({ id: 2 });
    Jornada.create.mockResolvedValue({ id: 10 });
    Jornada.findOne.mockResolvedValue({ id: 10, jornada: 1 });

    const { promesa, res } = llamar(ctrl.crear, {
      body: { id_plantilla: 1, id_equipo_local: 2, id_equipo_visitante: 3, jornada: 1, fecha: '2026-01-01' }
    });
    await promesa;

    expect(Jornada.create).toHaveBeenCalled();
    expect(Partido.create).toHaveBeenCalledTimes(2);
    expect(res._status).toBe(201);
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Jornada.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '99' }, body: {} });
    await promesa;
    expect(res._status).toBe(404);
  });

  it('actualizar guarda cambios', async () => {
    const item = { id: 1, save: vi.fn().mockResolvedValue() };
    Jornada.findOne.mockResolvedValue(item);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { jornada: 5 }
    });
    await promesa;
    expect(item.jornada).toBe(5);
    expect(item.save).toHaveBeenCalled();
  });

  it('eliminar borra la jornada', async () => {
    Jornada.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });
    await promesa;
    expect(Jornada.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(res._status).toBe(204);
  });
});
