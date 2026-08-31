import { describe, it, expect, beforeEach } from 'vitest';
import { Cambio } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/cambio.controller.js';

describe('Sección Cambios · cambio.controller', () => {
  beforeEach(() => {
    Cambio.findAll.mockReset();
    Cambio.findByPk.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve los cambios ordenados por fecha descendente', async () => {
    const cambios = [{ id: 1, entidad: 'usuarios', accion: 'crear' }];
    Cambio.findAll.mockResolvedValue(cambios);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(Cambio.findAll).toHaveBeenCalledWith(expect.objectContaining({
      order: [['created_at', 'DESC']],
      include: [expect.objectContaining({ as: 'usuario' })]
    }));
    expect(res._json).toBe(cambios);
  });

  it('listar respeta límite máximo de 500', async () => {
    Cambio.findAll.mockResolvedValue([]);
    const { promesa } = llamar(ctrl.listar, { query: { limit: '9999' } });

    await promesa;

    const arg = Cambio.findAll.mock.calls[0][0];
    expect(arg.limit).toBe(500);
  });

  it('listar filtra por entidad y acción si se pasan', async () => {
    Cambio.findAll.mockResolvedValue([]);
    const { promesa } = llamar(ctrl.listar, { query: { entidad: 'usuarios', accion: 'editar' } });

    await promesa;

    const arg = Cambio.findAll.mock.calls[0][0];
    expect(arg.where).toEqual({ entidad: 'usuarios', accion: 'editar' });
  });

  it('obtener devuelve 404 si no existe', async () => {
    Cambio.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ message: 'Cambio no encontrado.' });
  });
});