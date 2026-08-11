import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Categoria, Entrenador, Delegado, Temporada, Division } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/categoria.controller.js';

describe('Sección Categorías · categoria.controller', () => {
  beforeEach(() => {
    Categoria.findAll.mockReset();
    Categoria.findOne.mockReset();
    Categoria.create.mockReset();
    Categoria.destroy.mockReset();
    Temporada.findOne.mockReset();
    Entrenador.findOne.mockReset();
    Entrenador.count.mockReset();
    Delegado.findOne.mockReset();
    Division.findOne.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve las categorías', async () => {
    const categorias = [{ id: 1, nombre: 'Alevín' }];
    Categoria.findAll.mockResolvedValue(categorias);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(Categoria.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined, include: expect.any(Array) })
    );
    expect(res._json).toEqual([{ id: 1, nombre: 'Alevín', ids_entrenadores: [] }]);
  });

  it('listar filtra por temporada', async () => {
    Categoria.findAll.mockResolvedValue([]);
    const { promesa, res } = llamar(ctrl.listar, { query: { id_temporada: '3' } });

    await promesa;

    expect(Categoria.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_temporada: '3' } })
    );
  });

  it('obtener devuelve la categoría por id', async () => {
    const categoria = { id: 3, nombre: 'Infantil', entrenadores: [{ id: 7 }] };
    Categoria.findOne.mockResolvedValue(categoria);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '3' } });

    await promesa;

    expect(Categoria.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id: '3' }, include: expect.any(Array) }));
    expect(res._json).toEqual({ id: 3, nombre: 'Infantil', entrenadores: [{ id: 7 }], ids_entrenadores: [7] });
  });

  it('obtener devuelve 404 si no existe', async () => {
    Categoria.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ message: 'Categoría no encontrada.' });
  });

  it('crear valida campos obligatorios', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'Alevín' } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Nombre y temporada son obligatorios.');
    expect(Categoria.create).not.toHaveBeenCalled();
  });

  it('crear valida que la temporada exista', async () => {
    Temporada.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'Alevín', id_temporada: 99 } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('La temporada indicada no existe.');
  });

  it('crear valida que los entrenadores existan', async () => {
    Temporada.findOne.mockResolvedValue({ id: 1 });
    Entrenador.count.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { nombre: 'Alevín', id_temporada: 1, ids_entrenadores: [99, 100] }
    });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Algún entrenador indicado no existe.');
  });

  it('crear valida que el delegado exista', async () => {
    Temporada.findOne.mockResolvedValue({ id: 1 });
    Delegado.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { nombre: 'Alevín', id_temporada: 1, id_delegado: 99 }
    });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El delegado indicado no existe.');
  });

  it('crear crea la categoría y devuelve 201', async () => {
    const creada = { id: 5, nombre: 'Alevín', id_temporada: 1 };
    const completo = { id: 5, nombre: 'Alevín', temporada: { id: 1 } };
    Temporada.findOne.mockResolvedValue({ id: 1 });
    Categoria.create.mockResolvedValue(creada);
    Categoria.findOne.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'Alevín', id_temporada: 1 } });

    await promesa;

    expect(Categoria.create).toHaveBeenCalledWith({
      nombre: 'Alevín', alias: null, id_temporada: 1, id_division: null, id_delegado: null
    });
    expect(res._status).toBe(201);
    expect(res._json).toEqual(completo);
  });

  it('crear guarda el alias si se envía', async () => {
    Temporada.findOne.mockResolvedValue({ id: 1 });
    Categoria.create.mockResolvedValue({ id: 8 });
    Categoria.findOne.mockResolvedValue({ id: 8, alias: 'Ali' });
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'Alevín', alias: 'Ali', id_temporada: 1 } });

    await promesa;

    expect(Categoria.create).toHaveBeenCalledWith({
      nombre: 'Alevín', alias: 'Ali', id_temporada: 1, id_division: null, id_delegado: null
    });
    expect(res._status).toBe(201);
  });

  it('crear valida que la división exista', async () => {
    Temporada.findOne.mockResolvedValue({ id: 1 });
    Division.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { nombre: 'Alevín', id_temporada: 1, id_division: 99 }
    });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('La división indicada no existe.');
  });

  it('crear guarda la división si se envía', async () => {
    Temporada.findOne.mockResolvedValue({ id: 1 });
    Division.findOne.mockResolvedValue({ id: 3 });
    Categoria.create.mockResolvedValue({ id: 9 });
    Categoria.findOne.mockResolvedValue({ id: 9, id_division: 3 });
    const { promesa, res } = llamar(ctrl.crear, {
      body: { nombre: 'Alevín', id_temporada: 1, id_division: 3 }
    });

    await promesa;

    expect(Categoria.create).toHaveBeenCalledWith({
      nombre: 'Alevín', alias: null, id_temporada: 1, id_division: 3, id_delegado: null
    });
    expect(res._status).toBe(201);
  });

  it('crear asigna varios entrenadores si se envían', async () => {
    Temporada.findOne.mockResolvedValue({ id: 1 });
    Entrenador.count.mockResolvedValue(2);
    const creada = { id: 10, setEntrenadores: vi.fn().mockResolvedValue() };
    const completo = { id: 10, nombre: 'Alevín', entrenadores: [{ id: 1 }, { id: 2 }] };
    Categoria.create.mockResolvedValue(creada);
    Categoria.findOne.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { nombre: 'Alevín', id_temporada: 1, ids_entrenadores: [1, 2] }
    });

    await promesa;

    expect(Entrenador.count).toHaveBeenCalledWith({ where: { id: [1, 2] } });
    expect(creada.setEntrenadores).toHaveBeenCalledWith([1, 2]);
    expect(res._status).toBe(201);
    expect(res._json.ids_entrenadores).toEqual([1, 2]);
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Categoria.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'X' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar valida que la temporada exista al cambiarla', async () => {
    const categoria = { id: 1, nombre: 'Alevín', save: vi.fn() };
    Categoria.findOne.mockResolvedValue(categoria);
    Temporada.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { id_temporada: 99 } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('La temporada indicada no existe.');
  });

  it('actualizar guarda los cambios', async () => {
    const categoria = { id: 1, nombre: 'Viejo', save: vi.fn().mockResolvedValue() };
    const actualizada = { id: 1, nombre: 'Nuevo', temporada: null };
    Categoria.findOne.mockResolvedValueOnce(categoria).mockResolvedValueOnce(actualizada);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'Nuevo' } });

    await promesa;

    expect(categoria.nombre).toBe('Nuevo');
    expect(categoria.save).toHaveBeenCalled();
    expect(res._json).toEqual({ ...actualizada, ids_entrenadores: [] });
  });

  it('actualizar guarda y limpia el alias', async () => {
    const categoria = { id: 1, nombre: 'Alevín', alias: 'Ali', save: vi.fn().mockResolvedValue() };
    const actualizada = { id: 1, nombre: 'Alevín', alias: '', temporada: null };
    Categoria.findOne.mockResolvedValueOnce(categoria).mockResolvedValueOnce(actualizada);
    const { promesa } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { alias: 'Nuevo Alias' } });

    await promesa;

    expect(categoria.alias).toBe('Nuevo Alias');
    expect(categoria.save).toHaveBeenCalled();
  });

  it('actualizar guarda la división y valida que exista', async () => {
    const categoria = { id: 1, nombre: 'Alevín', save: vi.fn().mockResolvedValue() };
    Categoria.findOne.mockResolvedValue(categoria);
    Division.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { id_division: 99 } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('La división indicada no existe.');
    expect(categoria.save).not.toHaveBeenCalled();

    Division.findOne.mockResolvedValue({ id: 3 });
    const { promesa: promesa2 } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { id_division: 3 } });
    await promesa2;
    expect(categoria.id_division).toBe(3);
    expect(categoria.save).toHaveBeenCalled();
  });

  it('eliminar elimina y responde 204', async () => {
    Categoria.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });

    await promesa;

    expect(Categoria.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(res._status).toBe(204);
  });

  it('eliminar devuelve 404 si no encuentra nada', async () => {
    Categoria.destroy.mockResolvedValue(0);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
  });
});
