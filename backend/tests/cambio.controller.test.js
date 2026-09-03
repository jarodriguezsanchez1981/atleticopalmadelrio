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

  it('obtener devuelve el cambio con usuario', async () => {
    const cambio = { id: 1, entidad: 'usuarios', accion: 'crear', usuario: { id: 1, usuario: 'admin' } };
    Cambio.findByPk.mockResolvedValue(cambio);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '1' } });

    await promesa;

    expect(res._json).toBe(cambio);
    expect(Cambio.findByPk).toHaveBeenCalledWith('1', expect.objectContaining({
      include: [expect.objectContaining({ as: 'usuario' })]
    }));
  });

  it('listar respeta límite por defecto (200)', async () => {
    Cambio.findAll.mockResolvedValue([]);
    const { promesa } = llamar(ctrl.listar);

    await promesa;

    const arg = Cambio.findAll.mock.calls[0][0];
    expect(arg.limit).toBe(200);
  });

  it('listar respeta límite válido (< 500)', async () => {
    Cambio.findAll.mockResolvedValue([]);
    const { promesa } = llamar(ctrl.listar, { query: { limit: '100' } });

    await promesa;

    const arg = Cambio.findAll.mock.calls[0][0];
    expect(arg.limit).toBe(100);
  });

  it('listar filtra por id_usuario', async () => {
    Cambio.findAll.mockResolvedValue([]);
    const { promesa } = llamar(ctrl.listar, { query: { id_usuario: '3' } });

    await promesa;

    const arg = Cambio.findAll.mock.calls[0][0];
    expect(arg.where.id_usuario).toBe('3');
  });

  it('listar usa offset correcto', async () => {
    Cambio.findAll.mockResolvedValue([]);
    const { promesa } = llamar(ctrl.listar, { query: { offset: '50' } });

    await promesa;

    const arg = Cambio.findAll.mock.calls[0][0];
    expect(arg.offset).toBe(50);
  });

  it('listar offset por defecto es 0', async () => {
    Cambio.findAll.mockResolvedValue([]);
    const { promesa } = llamar(ctrl.listar);

    await promesa;

    const arg = Cambio.findAll.mock.calls[0][0];
    expect(arg.offset).toBe(0);
  });

  it('listar filtra por entidad y acción combinados', async () => {
    Cambio.findAll.mockResolvedValue([]);
    const { promesa } = llamar(ctrl.listar, {
      query: { entidad: 'jugadores', accion: 'eliminar', limit: '50' }
    });

    await promesa;

    const arg = Cambio.findAll.mock.calls[0][0];
    expect(arg.where).toEqual({ entidad: 'jugadores', accion: 'eliminar' });
    expect(arg.limit).toBe(50);
  });

  it('listar con limit NaN usa 200 por defecto', async () => {
    Cambio.findAll.mockResolvedValue([]);
    const { promesa } = llamar(ctrl.listar, { query: { limit: 'abc' } });

    await promesa;

    const arg = Cambio.findAll.mock.calls[0][0];
    expect(arg.limit).toBe(200);
  });
});