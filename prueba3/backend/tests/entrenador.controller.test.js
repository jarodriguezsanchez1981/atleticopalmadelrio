import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Entrenador } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/entrenador.controller.js';

describe('Sección Entrenadores · entrenador.controller', () => {
  beforeEach(() => {
    Entrenador.findAll.mockReset();
    Entrenador.findOne.mockReset();
    Entrenador.create.mockReset();
    Entrenador.destroy.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve los entrenadores serializados', async () => {
    const entrenador = { id: 1, nombre: 'Carlos' };
    Entrenador.findAll.mockResolvedValue([entrenador]);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(res._json).toEqual([{ id: 1, nombre: 'Carlos', ids_titulos: [] }]);
  });

  it('obtener devuelve 404 si no existe', async () => {
    Entrenador.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ message: 'Entrenador no encontrado.' });
  });

  it('obtener devuelve el entrenador serializado', async () => {
    const entrenador = { id: 3, nombre: 'Ana' };
    Entrenador.findOne.mockResolvedValue(entrenador);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '3' } });

    await promesa;

    expect(res._json).toEqual({ id: 3, nombre: 'Ana', ids_titulos: [] });
  });

  it('crear valida campos obligatorios', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'Carlos' } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Nombre, apellidos y DNI son obligatorios.');
    expect(Entrenador.create).not.toHaveBeenCalled();
  });

  it('crear rechaza un DNI no válido', async () => {
    const { promesa, res } = llamar(ctrl.crear, {
      body: { nombre: 'Carlos', apellidos: 'Díaz', dni: '12345678A' }
    });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El DNI introducido no es válido.');
    expect(Entrenador.create).not.toHaveBeenCalled();
  });

  it('actualizar rechaza un DNI no válido', async () => {
    const entrenador = { id: 1, save: vi.fn() };
    Entrenador.findOne.mockResolvedValueOnce(entrenador);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { dni: '12345678A' }
    });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El DNI introducido no es válido.');
  });

  it('crear crea el entrenador, asigna títulos y devuelve 201', async () => {
    const creado = { id: 5, setTitulos: vi.fn().mockResolvedValue() };
    const completo = { id: 5, nombre: 'Carlos', titulos: [{ id: 1 }] };
    Entrenador.create.mockResolvedValue(creado);
    Entrenador.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { nombre: 'Carlos', apellidos: 'Díaz', dni: '12345678Z', ids_titulos: ['1'] }
    });

    await promesa;

    expect(Entrenador.create).toHaveBeenCalledWith({
      nombre: 'Carlos', apellidos: 'Díaz', dni: '12345678Z', foto: null, email: null, telefono: null
    });
    expect(creado.setTitulos).toHaveBeenCalledWith([1]);
    expect(res._status).toBe(201);
    expect(res._json.ids_titulos).toEqual([1]);
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Entrenador.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'X' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar guarda los cambios y asigna títulos', async () => {
    const entrenador = { id: 1, nombre: 'Viejo', save: vi.fn().mockResolvedValue(), setTitulos: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, nombre: 'Nuevo', titulos: [] };
    Entrenador.findOne.mockResolvedValueOnce(entrenador).mockResolvedValueOnce(actualizado);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { nombre: 'Nuevo', titulos: [{ id: 1 }] }
    });

    await promesa;

    expect(entrenador.nombre).toBe('Nuevo');
    expect(entrenador.save).toHaveBeenCalled();
    expect(entrenador.setTitulos).toHaveBeenCalledWith([1]);
    expect(res._json).toEqual({ id: 1, nombre: 'Nuevo', titulos: [], ids_titulos: [] });
  });

  it('eliminar elimina y responde 204', async () => {
    Entrenador.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });

    await promesa;

    expect(Entrenador.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(res._status).toBe(204);
  });

  it('eliminar devuelve 404 si no encuentra nada', async () => {
    Entrenador.destroy.mockResolvedValue(0);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
  });
});
