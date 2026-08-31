import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Categoria, TipoFutbol } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/categoria.controller.js';

describe('Sección Categorías · categoria.controller', () => {
  beforeEach(() => {
    Categoria.findAll.mockReset();
    Categoria.findOne.mockReset();
    Categoria.create.mockReset();
    Categoria.destroy.mockReset();
    TipoFutbol.findOne.mockReset();
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
      expect.objectContaining({ include: expect.any(Array), order: [['nombre', 'ASC']] })
    );
    expect(res._json).toEqual([{ id: 1, nombre: 'Alevín' }]);
  });

  it('obtener devuelve la categoría por id', async () => {
    const categoria = { id: 3, nombre: 'Infantil' };
    Categoria.findOne.mockResolvedValue(categoria);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '3' } });

    await promesa;

    expect(Categoria.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id: '3' }, include: expect.any(Array) }));
    expect(res._json).toEqual({ id: 3, nombre: 'Infantil' });
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
    expect(res._json.message).toBe('Nombre y tipo de fútbol son obligatorios.');
    expect(Categoria.create).not.toHaveBeenCalled();
  });

  it('crear valida que el tipo de fútbol exista', async () => {
    TipoFutbol.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'Alevín', id_tipofutbol: 99 } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El tipo de fútbol indicado no existe.');
    expect(Categoria.create).not.toHaveBeenCalled();
  });

  it('crear crea la categoría y devuelve 201', async () => {
    const creada = { id: 5, nombre: 'Alevín' };
    const completo = { id: 5, nombre: 'Alevín', tipofutbol: { id: 1, nombre: 'Futbol 7' } };
    TipoFutbol.findOne.mockResolvedValue({ id: 1, nombre: 'Futbol 7' });
    Categoria.create.mockResolvedValue(creada);
    Categoria.findOne.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { nombre: 'Alevín', id_tipofutbol: 1 }
    });

    await promesa;

    expect(TipoFutbol.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(Categoria.create).toHaveBeenCalledWith({
      nombre: 'Alevín', alias: null, id_tipofutbol: 1,
      tiempopartido: null, tiempoentrenamiento: null, orden: null
    });
    expect(res._status).toBe(201);
    expect(res._json).toEqual(completo);
  });

  it('crear guarda el alias si se envía', async () => {
    TipoFutbol.findOne.mockResolvedValue({ id: 1 });
    Categoria.create.mockResolvedValue({ id: 8 });
    Categoria.findOne.mockResolvedValue({ id: 8, alias: 'Ali' });
    const { promesa, res } = llamar(ctrl.crear, {
      body: { nombre: 'Alevín', alias: 'Ali', id_tipofutbol: 1 }
    });

    await promesa;

    expect(Categoria.create).toHaveBeenCalledWith({
      nombre: 'Alevín', alias: 'Ali', id_tipofutbol: 1,
      tiempopartido: null, tiempoentrenamiento: null, orden: null
    });
    expect(res._status).toBe(201);
  });

  it('crear guarda los tiempos si se envían', async () => {
    TipoFutbol.findOne.mockResolvedValue({ id: 1 });
    Categoria.create.mockResolvedValue({ id: 9 });
    Categoria.findOne.mockResolvedValue({ id: 9, tiempopartido: 90, tiempoentrenamiento: 60 });
    const { promesa, res } = llamar(ctrl.crear, {
      body: { nombre: 'Alevín', id_tipofutbol: 1, tiempopartido: 90, tiempoentrenamiento: 60 }
    });

    await promesa;

    expect(Categoria.create).toHaveBeenCalledWith({
      nombre: 'Alevín', alias: null, id_tipofutbol: 1,
      tiempopartido: 90, tiempoentrenamiento: 60, orden: null
    });
    expect(res._status).toBe(201);
  });

  it('crear valida que el tiempo de partido sea positivo', async () => {
    TipoFutbol.findOne.mockResolvedValue({ id: 1 });
    const { promesa, res } = llamar(ctrl.crear, {
      body: { nombre: 'Alevín', id_tipofutbol: 1, tiempopartido: 0 }
    });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El tiempo de partido debe ser un número de minutos positivo.');
    expect(Categoria.create).not.toHaveBeenCalled();
  });

  it('crear valida que el tiempo de entrenamiento sea positivo', async () => {
    TipoFutbol.findOne.mockResolvedValue({ id: 1 });
    const { promesa, res } = llamar(ctrl.crear, {
      body: { nombre: 'Alevín', id_tipofutbol: 1, tiempoentrenamiento: -5 }
    });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El tiempo de entrenamiento debe ser un número de minutos positivo.');
    expect(Categoria.create).not.toHaveBeenCalled();
  });

  it('actualizar guarda los tiempos y valida su valor', async () => {
    const categoria = { id: 1, nombre: 'Alevín', save: vi.fn().mockResolvedValue() };
    Categoria.findOne.mockResolvedValue(categoria);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { tiempopartido: -1 } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El tiempo de partido debe ser un número de minutos positivo.');
    expect(categoria.save).not.toHaveBeenCalled();

    const { promesa: promesa2 } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { tiempopartido: 90, tiempoentrenamiento: 60 }
    });
    await promesa2;

    expect(categoria.tiempopartido).toBe(90);
    expect(categoria.tiempoentrenamiento).toBe(60);
    expect(categoria.save).toHaveBeenCalled();
  });

  it('actualizar limpia los tiempos si se envían vacíos', async () => {
    const categoria = { id: 1, nombre: 'Alevín', tiempopartido: 90, tiempoentrenamiento: 60, save: vi.fn().mockResolvedValue() };
    Categoria.findOne.mockResolvedValue(categoria);
    const { promesa } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { tiempopartido: null, tiempoentrenamiento: null }
    });

    await promesa;

    expect(categoria.tiempopartido).toBeNull();
    expect(categoria.tiempoentrenamiento).toBeNull();
    expect(categoria.save).toHaveBeenCalled();
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Categoria.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'X' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar guarda los cambios', async () => {
    const categoria = { id: 1, nombre: 'Viejo', save: vi.fn().mockResolvedValue() };
    const actualizada = { id: 1, nombre: 'Nuevo' };
    Categoria.findOne.mockResolvedValueOnce(categoria).mockResolvedValueOnce(actualizada);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'Nuevo' } });

    await promesa;

    expect(categoria.nombre).toBe('Nuevo');
    expect(categoria.save).toHaveBeenCalled();
    expect(res._json).toEqual({ id: 1, nombre: 'Nuevo' });
  });

  it('actualizar guarda y limpia el alias', async () => {
    const categoria = { id: 1, nombre: 'Alevín', alias: 'Ali', save: vi.fn().mockResolvedValue() };
    const actualizada = { id: 1, nombre: 'Alevín', alias: '' };
    Categoria.findOne.mockResolvedValueOnce(categoria).mockResolvedValueOnce(actualizada);
    const { promesa } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { alias: 'Nuevo Alias' } });

    await promesa;

    expect(categoria.alias).toBe('Nuevo Alias');
    expect(categoria.save).toHaveBeenCalled();
  });

  it('actualizar valida el tipo de fútbol al cambiarlo', async () => {
    const categoria = { id: 1, nombre: 'Alevín', save: vi.fn().mockResolvedValue() };
    Categoria.findOne.mockResolvedValue(categoria);
    TipoFutbol.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { id_tipofutbol: 99 } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El tipo de fútbol indicado no existe.');
    expect(categoria.save).not.toHaveBeenCalled();

    TipoFutbol.findOne.mockResolvedValue({ id: 2 });
    const { promesa: promesa2 } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { id_tipofutbol: 2 } });
    await promesa2;
    expect(categoria.id_tipofutbol).toBe(2);
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
