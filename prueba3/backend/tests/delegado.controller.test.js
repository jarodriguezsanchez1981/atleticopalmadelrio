import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Delegado, Categoria, Temporada } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/delegado.controller.js';

describe('Sección Delegados · delegado.controller', () => {
  beforeEach(() => {
    Delegado.findAll.mockReset();
    Delegado.findOne.mockReset();
    Delegado.create.mockReset();
    Delegado.destroy.mockReset();
    Categoria.update.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve los delegados sin filtros', async () => {
    const delegados = [{ id: 1, nombre: 'Ana' }];
    Delegado.findAll.mockResolvedValue(delegados);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(Delegado.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined, order: [['apellidos', 'ASC']] })
    );
    expect(res._json).toEqual(delegados);
  });

  it('listar filtra por categoría y temporada', async () => {
    Delegado.findAll.mockResolvedValue([]);
    const { promesa, res } = llamar(ctrl.listar, { query: { id_categoria: '2', id_temporada: '3' } });

    await promesa;

    expect(Delegado.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_categoria: '2', id_temporada: '3' } })
    );
  });

  it('obtener devuelve el delegado por id', async () => {
    const delegado = { id: 3, nombre: 'Luis' };
    Delegado.findOne.mockResolvedValue(delegado);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '3' } });

    await promesa;

    expect(Delegado.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id: '3' }, include: expect.any(Array) }));
    expect(res._json).toEqual(delegado);
  });

  it('obtener devuelve 404 si no existe', async () => {
    Delegado.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ message: 'Delegado no encontrado.' });
  });

  it('crear valida campos obligatorios', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'Ana' } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Nombre, apellidos, DNI y temporada son obligatorios.');
    expect(Delegado.create).not.toHaveBeenCalled();
  });

  it('crear rechaza un DNI no válido', async () => {
    const { promesa, res } = llamar(ctrl.crear, {
      body: { nombre: 'Ana', apellidos: 'López', dni: '12345678A', id_temporada: 1 }
    });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El DNI introducido no es válido.');
    expect(Delegado.create).not.toHaveBeenCalled();
  });

  it('actualizar rechaza un DNI no válido', async () => {
    const delegado = { id: 1, save: vi.fn() };
    Delegado.findOne.mockResolvedValueOnce(delegado);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { dni: '12345678A' }
    });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El DNI introducido no es válido.');
  });

  it('crear crea el delegado y devuelve 201 con el registro completo', async () => {
    const creado = { id: 5, nombre: 'Ana', apellidos: 'López', dni: '12345678Z', id_temporada: 1 };
    const completo = { id: 5, ...creado, categoria: null, temporada: { id: 1 } };
    Delegado.create.mockResolvedValue(creado);
    Delegado.findOne.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { nombre: 'Ana', apellidos: 'López', dni: '12345678Z', id_temporada: 1 }
    });

    await promesa;

    expect(Delegado.create).toHaveBeenCalledWith({
      nombre: 'Ana', apellidos: 'López', dni: '12345678Z', foto: null, tipo: 'campo', id_categoria: null, id_temporada: 1
    });
    expect(res._status).toBe(201);
    expect(res._json).toEqual(completo);
  });

  it('crear sincroniza la categoría asignada con id_delegado', async () => {
    const creado = { id: 6, nombre: 'Ana', apellidos: 'López', dni: '12345678Z', id_temporada: 1, id_categoria: 3 };
    const completo = { id: 6, id_categoria: 3, categoria: null, temporada: { id: 1 } };
    Delegado.create.mockResolvedValue(creado);
    Delegado.findOne.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { nombre: 'Ana', apellidos: 'López', dni: '12345678Z', id_temporada: 1, id_categoria: '3' }
    });

    await promesa;

    expect(Categoria.update).toHaveBeenCalledWith({ id_delegado: 6 }, { where: { id: 3 } });
    expect(res._status).toBe(201);
  });

  it('actualizar reasigna la categoría y limpia la anterior del delegado', async () => {
    const delegado = { id: 1, nombre: 'Viejo', id_categoria: 3, save: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, nombre: 'Viejo', id_categoria: 4, categoria: null, temporada: null };
    Delegado.findOne.mockResolvedValueOnce(delegado).mockResolvedValueOnce(actualizado);
    const { promesa } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { id_categoria: '4' }
    });

    await promesa;

    expect(Categoria.update).toHaveBeenCalledWith({ id_delegado: 1 }, { where: { id: 4 } });
    expect(Categoria.update).toHaveBeenCalledWith({ id_delegado: null }, { where: { id: 3, id_delegado: 1 } });
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Delegado.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'X' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar guarda los cambios y devuelve el registro actualizado', async () => {
    const delegado = { id: 1, nombre: 'Viejo', save: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, nombre: 'Nuevo', categoria: null, temporada: null };
    Delegado.findOne.mockResolvedValueOnce(delegado).mockResolvedValueOnce(actualizado);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'Nuevo' } });

    await promesa;

    expect(delegado.nombre).toBe('Nuevo');
    expect(delegado.save).toHaveBeenCalled();
    expect(res._json).toEqual(actualizado);
  });

  it('eliminar elimina y responde 204', async () => {
    Delegado.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });

    await promesa;

    expect(Delegado.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(res._status).toBe(204);
  });

  it('eliminar devuelve 404 si no encuentra nada', async () => {
    Delegado.destroy.mockResolvedValue(0);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
  });
});
