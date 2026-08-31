import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Division } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/division.controller.js';

describe('Sección División · division.controller', () => {
  beforeEach(() => {
    Division.findAll.mockReset();
    Division.findOne.mockReset();
    Division.create.mockReset();
    Division.destroy.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve las divisiones ordenadas por nombre ASC', async () => {
    const divisiones = [{ id: 1, nombre: 'Primera' }];
    Division.findAll.mockResolvedValue(divisiones);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(Division.findAll).toHaveBeenCalledWith({ order: [['nombre', 'ASC']] });
    expect(res._json).toEqual(divisiones);
  });

  it('obtener devuelve la división por id', async () => {
    const division = { id: 3, nombre: 'Segunda' };
    Division.findOne.mockResolvedValue(division);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '3' } });

    await promesa;

    expect(Division.findOne).toHaveBeenCalledWith({ where: { id: '3' } });
    expect(res._json).toEqual(division);
  });

  it('obtener devuelve 404 si no existe', async () => {
    Division.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ message: 'División no encontrada.' });
  });

  it('crear valida nombre obligatorio', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: {} });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El nombre es obligatorio.');
    expect(Division.create).not.toHaveBeenCalled();
  });

  it('crear crea la división y devuelve 201', async () => {
    const creado = { id: 5, nombre: 'Tercera' };
    Division.create.mockResolvedValue(creado);
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'Tercera' } });

    await promesa;

    expect(Division.create).toHaveBeenCalledWith({ nombre: 'Tercera' });
    expect(res._status).toBe(201);
    expect(res._json).toEqual(creado);
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Division.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'X' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar guarda los cambios', async () => {
    const division = { id: 1, nombre: 'Viejo', save: vi.fn().mockResolvedValue() };
    Division.findOne.mockResolvedValue(division);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'Nuevo' } });

    await promesa;

    expect(division.nombre).toBe('Nuevo');
    expect(division.save).toHaveBeenCalled();
    expect(res._json).toEqual(division);
  });

  it('eliminar elimina y responde 204', async () => {
    Division.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });

    await promesa;

    expect(Division.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(res._status).toBe(204);
  });

  it('eliminar devuelve 404 si no encuentra nada', async () => {
    Division.destroy.mockResolvedValue(0);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
  });
});