import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Entrenador, Categoria, Temporada, Titulo } from './helpers/models.js';
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
    const entrenador = { id: 1, nombre: 'Carlos', categorias: [{ id: 2 }] };
    Entrenador.findAll.mockResolvedValue([entrenador]);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(res._json).toEqual([{ id: 1, nombre: 'Carlos', categorias: [{ id: 2 }], ids_categorias: [2], ids_titulos: [] }]);
  });

  it('listar filtra por temporada', async () => {
    Entrenador.findAll.mockResolvedValue([]);
    const { promesa, res } = llamar(ctrl.listar, { query: { id_temporada: '3' } });

    await promesa;

    expect(Entrenador.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_temporada: '3' }, include: expect.any(Array) })
    );
  });

  it('obtener devuelve 404 si no existe', async () => {
    Entrenador.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ message: 'Entrenador no encontrado.' });
  });

  it('obtener devuelve el entrenador serializado', async () => {
    const entrenador = { id: 3, nombre: 'Ana', categorias: [{ id: 4 }] };
    Entrenador.findOne.mockResolvedValue(entrenador);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '3' } });

    await promesa;

    expect(res._json.ids_categorias).toEqual([4]);
  });

  it('crear valida campos obligatorios', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'Carlos' } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Nombre, apellidos, DNI y temporada son obligatorios.');
    expect(Entrenador.create).not.toHaveBeenCalled();
  });

  it('crear crea el entrenador, asigna categorías y títulos y devuelve 201', async () => {
    const creado = { id: 5, setCategorias: vi.fn().mockResolvedValue(), setTitulos: vi.fn().mockResolvedValue() };
    const completo = { id: 5, nombre: 'Carlos', categorias: [{ id: 2 }], titulos: [{ id: 1 }] };
    Entrenador.create.mockResolvedValue(creado);
    Entrenador.findOne.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { nombre: 'Carlos', apellidos: 'Díaz', dni: '12345678A', id_temporada: 1, ids_categorias: ['2'], ids_titulos: ['1'] }
    });

    await promesa;

    expect(Entrenador.create).toHaveBeenCalledWith({
      nombre: 'Carlos', apellidos: 'Díaz', dni: '12345678A', foto: null, id_temporada: 1
    });
    expect(creado.setCategorias).toHaveBeenCalledWith([2]);
    expect(creado.setTitulos).toHaveBeenCalledWith([1]);
    expect(res._status).toBe(201);
    expect(res._json.ids_categorias).toEqual([2]);
    expect(res._json.ids_titulos).toEqual([1]);
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Entrenador.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'X' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar guarda los cambios y asigna categorías y títulos', async () => {
    const entrenador = { id: 1, nombre: 'Viejo', save: vi.fn().mockResolvedValue(), setCategorias: vi.fn().mockResolvedValue(), setTitulos: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, nombre: 'Nuevo', categorias: [], titulos: [] };
    Entrenador.findOne.mockResolvedValueOnce(entrenador).mockResolvedValueOnce(actualizado);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { nombre: 'Nuevo', categorias: [{ id: 2 }], titulos: [{ id: 1 }] }
    });

    await promesa;

    expect(entrenador.nombre).toBe('Nuevo');
    expect(entrenador.save).toHaveBeenCalled();
    expect(entrenador.setCategorias).toHaveBeenCalledWith([2]);
    expect(entrenador.setTitulos).toHaveBeenCalledWith([1]);
    expect(res._json).toEqual({ id: 1, nombre: 'Nuevo', categorias: [], titulos: [], ids_categorias: [], ids_titulos: [] });
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
