import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Categoria, Entrenador, Delegado, Temporada } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/categoria.controller.js';

describe('Sección Categorías · categoria.controller', () => {
  beforeEach(() => {
    Categoria.findAll.mockReset();
    Categoria.findByPk.mockReset();
    Categoria.create.mockReset();
    Categoria.destroy.mockReset();
    Temporada.findByPk.mockReset();
    Entrenador.findByPk.mockReset();
    Delegado.findByPk.mockReset();
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
    expect(res._json).toEqual(categorias);
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
    const categoria = { id: 3, nombre: 'Infantil' };
    Categoria.findByPk.mockResolvedValue(categoria);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '3' } });

    await promesa;

    expect(Categoria.findByPk).toHaveBeenCalledWith('3', expect.objectContaining({ include: expect.any(Array) }));
    expect(res._json).toEqual(categoria);
  });

  it('obtener devuelve 404 si no existe', async () => {
    Categoria.findByPk.mockResolvedValue(null);
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
    Temporada.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'Alevín', id_temporada: 99 } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('La temporada indicada no existe.');
  });

  it('crear valida que el entrenador exista', async () => {
    Temporada.findByPk.mockResolvedValue({ id: 1 });
    Entrenador.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { nombre: 'Alevín', id_temporada: 1, id_entrenador: 99 }
    });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El entrenador indicado no existe.');
  });

  it('crear valida que el delegado exista', async () => {
    Temporada.findByPk.mockResolvedValue({ id: 1 });
    Delegado.findByPk.mockResolvedValue(null);
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
    Temporada.findByPk.mockResolvedValue({ id: 1 });
    Categoria.create.mockResolvedValue(creada);
    Categoria.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'Alevín', id_temporada: 1 } });

    await promesa;

    expect(Categoria.create).toHaveBeenCalledWith({
      nombre: 'Alevín', id_temporada: 1, id_entrenador: null, id_delegado: null
    });
    expect(res._status).toBe(201);
    expect(res._json).toEqual(completo);
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Categoria.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'X' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar valida que la temporada exista al cambiarla', async () => {
    const categoria = { id: 1, nombre: 'Alevín', save: vi.fn() };
    Categoria.findByPk.mockResolvedValue(categoria);
    Temporada.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { id_temporada: 99 } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('La temporada indicada no existe.');
  });

  it('actualizar guarda los cambios', async () => {
    const categoria = { id: 1, nombre: 'Viejo', save: vi.fn().mockResolvedValue() };
    const actualizada = { id: 1, nombre: 'Nuevo', temporada: null };
    Categoria.findByPk.mockResolvedValueOnce(categoria).mockResolvedValueOnce(actualizada);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'Nuevo' } });

    await promesa;

    expect(categoria.nombre).toBe('Nuevo');
    expect(categoria.save).toHaveBeenCalled();
    expect(res._json).toEqual(actualizada);
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
