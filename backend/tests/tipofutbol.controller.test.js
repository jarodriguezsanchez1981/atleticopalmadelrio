import { describe, it, expect, beforeEach } from 'vitest';
import { TipoFutbol } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/tipofutbol.controller.js';

describe('Catálogo Tipos de Fútbol · tipofutbol.controller', () => {
  beforeEach(() => {
    TipoFutbol.findAll.mockReset();
    TipoFutbol.findOne.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve los tipos ordenados', async () => {
    TipoFutbol.findAll.mockResolvedValue([{ id: 1, nombre: 'Futbol 7' }]);
    const { promesa, res } = llamar(ctrl.listar);
    await promesa;
    expect(res._json).toHaveLength(1);
    expect(TipoFutbol.findAll).toHaveBeenCalledWith(expect.objectContaining({ order: [['id', 'ASC']] }));
  });

  it('obtener devuelve 404 si no existe', async () => {
    TipoFutbol.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });
    await promesa;
    expect(res._status).toBe(404);
    expect(res._json.message).toBe('Tipo de fútbol no encontrado.');
  });

  it('obtener devuelve el tipo', async () => {
    TipoFutbol.findOne.mockResolvedValue({ id: 2, nombre: 'Futbol 11' });
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '2' } });
    await promesa;
    expect(res._json).toEqual({ id: 2, nombre: 'Futbol 11' });
  });
});
