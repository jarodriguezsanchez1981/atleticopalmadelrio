import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Lugar } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/lugar.controller.js';

describe('Sección Lugares · lugar.controller', () => {
  beforeEach(() => {
    Lugar.findAll.mockReset();
    Lugar.findOne.mockReset();
    Lugar.create.mockReset();
    Lugar.destroy.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve todos los lugares ordenados por nombre', async () => {
    const lugares = [{ id: 1, nombre: 'Municipal' }];
    Lugar.findAll.mockResolvedValue(lugares);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(Lugar.findAll).toHaveBeenCalledWith({ order: [['nombre', 'ASC']] });
    expect(res._json).toEqual(lugares);
  });

  it('obtener devuelve el lugar por id', async () => {
    const lugar = { id: 3, nombre: 'Anexo' };
    Lugar.findOne.mockResolvedValue(lugar);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '3' } });

    await promesa;

    expect(Lugar.findOne).toHaveBeenCalledWith({ where: { id: '3' } });
    expect(res._json).toEqual(lugar);
  });

  it('obtener devuelve 404 si no existe', async () => {
    Lugar.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ message: 'Lugar no encontrado.' });
  });

  it('crear valida nombre obligatorio', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: {} });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El nombre es obligatorio.');
    expect(Lugar.create).not.toHaveBeenCalled();
  });

  it('crear crea el lugar y devuelve 201', async () => {
    const creado = { id: 5, nombre: 'Campo de fútbol' };
    Lugar.create.mockResolvedValue(creado);
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'Campo de fútbol' } });

    await promesa;

    expect(Lugar.create).toHaveBeenCalledWith({ nombre: 'Campo de fútbol' });
    expect(res._status).toBe(201);
    expect(res._json).toEqual(creado);
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Lugar.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'X' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar guarda los cambios', async () => {
    const lugar = { id: 1, nombre: 'Viejo', save: vi.fn().mockResolvedValue() };
    Lugar.findOne.mockResolvedValue(lugar);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'Nuevo' } });

    await promesa;

    expect(lugar.nombre).toBe('Nuevo');
    expect(lugar.save).toHaveBeenCalled();
    expect(res._json).toEqual(lugar);
  });

  it('eliminar elimina y responde 204', async () => {
    Lugar.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });

    await promesa;

    expect(Lugar.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(res._status).toBe(204);
  });

  it('eliminar devuelve 404 si no encuentra nada', async () => {
    Lugar.destroy.mockResolvedValue(0);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
  });
});
