import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Material } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/material.controller.js';

describe('Sección Material · material.controller', () => {
  beforeEach(() => {
    Material.findAll.mockReset();
    Material.findOne.mockReset();
    Material.create.mockReset();
    Material.destroy.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve el material ordenado por nombre ASC', async () => {
    const materiales = [{ id: 1, nombre: 'Balones' }];
    Material.findAll.mockResolvedValue(materiales);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(Material.findAll).toHaveBeenCalledWith({ order: [['nombre', 'ASC']] });
    expect(res._json).toEqual(materiales);
  });

  it('obtener devuelve el material por id', async () => {
    const material = { id: 3, nombre: 'Conos' };
    Material.findOne.mockResolvedValue(material);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '3' } });

    await promesa;

    expect(Material.findOne).toHaveBeenCalledWith({ where: { id: '3' } });
    expect(res._json).toEqual(material);
  });

  it('obtener devuelve 404 si no existe', async () => {
    Material.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ message: 'Material no encontrado.' });
  });

  it('crear valida nombre obligatorio', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: {} });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El nombre es obligatorio.');
    expect(Material.create).not.toHaveBeenCalled();
  });

  it('crear crea el material y devuelve 201', async () => {
    const creado = { id: 5, nombre: 'Petos' };
    Material.create.mockResolvedValue(creado);
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'Petos' } });

    await promesa;

    expect(Material.create).toHaveBeenCalledWith({ nombre: 'Petos' });
    expect(res._status).toBe(201);
    expect(res._json).toEqual(creado);
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Material.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'X' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar guarda los cambios', async () => {
    const material = { id: 1, nombre: 'Viejo', save: vi.fn().mockResolvedValue() };
    Material.findOne.mockResolvedValue(material);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'Nuevo' } });

    await promesa;

    expect(material.nombre).toBe('Nuevo');
    expect(material.save).toHaveBeenCalled();
    expect(res._json).toEqual(material);
  });

  it('eliminar elimina y responde 204', async () => {
    Material.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });

    await promesa;

    expect(Material.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(res._status).toBe(204);
  });

  it('eliminar devuelve 404 si no encuentra nada', async () => {
    Material.destroy.mockResolvedValue(0);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
  });
});
