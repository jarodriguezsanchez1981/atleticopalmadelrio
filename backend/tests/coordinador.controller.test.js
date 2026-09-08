import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Coordinador } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/coordinador.controller.js';

describe('Sección Coordinadores · coordinador.controller', () => {
  beforeEach(() => {
    Coordinador.findAll.mockReset();
    Coordinador.findOne.mockReset();
    Coordinador.create.mockReset();
    Coordinador.destroy.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve los coordinadores ordenados por apellidos ASC', async () => {
    const coordinadores = [{ id: 1, nombre: 'Ana', apellidos: 'García' }];
    Coordinador.findAll.mockResolvedValue(coordinadores);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(Coordinador.findAll).toHaveBeenCalledWith({ order: [['apellidos', 'ASC']] });
    expect(res._json).toEqual(coordinadores);
  });

  it('obtener devuelve el coordinador por id', async () => {
    const coordinador = { id: 3, nombre: 'Luis', apellidos: 'Pérez' };
    Coordinador.findOne.mockResolvedValue(coordinador);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '3' } });

    await promesa;

    expect(Coordinador.findOne).toHaveBeenCalledWith({ where: { id: '3' } });
    expect(res._json).toEqual(coordinador);
  });

  it('obtener devuelve 404 si no existe', async () => {
    Coordinador.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ message: 'Coordinador no encontrado.' });
  });

  it('crear valida nombre y apellidos obligatorios', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'Ana' } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Nombre y apellidos son obligatorios.');
    expect(Coordinador.create).not.toHaveBeenCalled();
  });

  it('crear crea el coordinador y devuelve 201', async () => {
    const creado = { id: 5, nombre: 'Ana', apellidos: 'García', email: 'ana@club.es', telefono: '600111222' };
    Coordinador.create.mockResolvedValue(creado);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { nombre: 'Ana', apellidos: 'García', email: 'ana@club.es', telefono: '600111222' }
    });

    await promesa;

    expect(Coordinador.create).toHaveBeenCalledWith({
      nombre: 'Ana', apellidos: 'García', email: 'ana@club.es', telefono: '600111222'
    });
    expect(res._status).toBe(201);
    expect(res._json).toEqual(creado);
  });

  it('crear permite email y teléfono vacíos', async () => {
    const creado = { id: 6, nombre: 'Luis', apellidos: 'Pérez' };
    Coordinador.create.mockResolvedValue(creado);
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'Luis', apellidos: 'Pérez' } });

    await promesa;

    expect(Coordinador.create).toHaveBeenCalledWith({
      nombre: 'Luis', apellidos: 'Pérez', email: null, telefono: null
    });
    expect(res._status).toBe(201);
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Coordinador.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'X' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar guarda los cambios', async () => {
    const coordinador = { id: 1, nombre: 'Viejo', email: null, save: vi.fn().mockResolvedValue() };
    Coordinador.findOne.mockResolvedValue(coordinador);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { nombre: 'Nuevo', email: 'nuevo@club.es' }
    });

    await promesa;

    expect(coordinador.nombre).toBe('Nuevo');
    expect(coordinador.email).toBe('nuevo@club.es');
    expect(coordinador.save).toHaveBeenCalled();
    expect(res._json).toEqual(coordinador);
  });

  it('eliminar elimina y responde 204', async () => {
    Coordinador.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });

    await promesa;

    expect(Coordinador.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(res._status).toBe(204);
  });

  it('eliminar devuelve 404 si no encuentra nada', async () => {
    Coordinador.destroy.mockResolvedValue(0);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
  });
});
