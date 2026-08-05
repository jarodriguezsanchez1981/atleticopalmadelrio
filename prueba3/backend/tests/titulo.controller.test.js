import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Titulo } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/titulo.controller.js';

describe('Sección Títulos · titulo.controller', () => {
  beforeEach(() => {
    Titulo.findAll.mockReset();
    Titulo.findByPk.mockReset();
    Titulo.create.mockReset();
    Titulo.destroy.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve los títulos ordenados por nombre ASC', async () => {
    const titulos = [{ id: 1, nombre: 'Nivel 1' }];
    Titulo.findAll.mockResolvedValue(titulos);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(Titulo.findAll).toHaveBeenCalledWith({ order: [['nombre', 'ASC']] });
    expect(res._json).toEqual(titulos);
  });

  it('obtener devuelve el título por id', async () => {
    const titulo = { id: 3, nombre: 'Nivel 2' };
    Titulo.findByPk.mockResolvedValue(titulo);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '3' } });

    await promesa;

    expect(Titulo.findByPk).toHaveBeenCalledWith('3');
    expect(res._json).toEqual(titulo);
  });

  it('obtener devuelve 404 si no existe', async () => {
    Titulo.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ message: 'Título no encontrado.' });
  });

  it('crear valida nombre obligatorio', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: {} });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El nombre es obligatorio.');
    expect(Titulo.create).not.toHaveBeenCalled();
  });

  it('crear crea el título y devuelve 201', async () => {
    const creado = { id: 5, nombre: 'Nivel 3' };
    Titulo.create.mockResolvedValue(creado);
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'Nivel 3' } });

    await promesa;

    expect(Titulo.create).toHaveBeenCalledWith({ nombre: 'Nivel 3' });
    expect(res._status).toBe(201);
    expect(res._json).toEqual(creado);
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Titulo.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'X' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar guarda los cambios', async () => {
    const titulo = { id: 1, nombre: 'Viejo', save: vi.fn().mockResolvedValue() };
    Titulo.findByPk.mockResolvedValue(titulo);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'Nuevo' } });

    await promesa;

    expect(titulo.nombre).toBe('Nuevo');
    expect(titulo.save).toHaveBeenCalled();
    expect(res._json).toEqual(titulo);
  });

  it('eliminar elimina y responde 204', async () => {
    Titulo.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });

    await promesa;

    expect(Titulo.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(res._status).toBe(204);
  });

  it('eliminar devuelve 404 si no encuentra nada', async () => {
    Titulo.destroy.mockResolvedValue(0);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
  });
});
