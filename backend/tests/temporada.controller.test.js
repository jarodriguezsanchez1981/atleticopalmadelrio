import { describe, it, expect, beforeEach } from 'vitest';
import { Temporada } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/temporada.controller.js';

describe('Sección Temporadas · temporada.controller', () => {
  beforeEach(() => {
    Temporada.findAll.mockReset();
    Temporada.findOne.mockReset();
    Temporada.create.mockReset();
    Temporada.destroy.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve las temporadas ordenadas por nombre DESC', async () => {
    const temporadas = [{ id: 1, nombre: '2025/26' }];
    Temporada.findAll.mockResolvedValue(temporadas);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(Temporada.findAll).toHaveBeenCalledWith({ order: [['nombre', 'DESC']] });
    expect(res._json).toEqual(temporadas);
  });

  it('obtener devuelve la temporada por id', async () => {
    const temporada = { id: 3, nombre: '2024/25' };
    Temporada.findOne.mockResolvedValue(temporada);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '3' } });

    await promesa;

    expect(Temporada.findOne).toHaveBeenCalledWith({ where: { id: '3' } });
    expect(res._json).toEqual(temporada);
  });

  it('obtener devuelve 404 si no existe', async () => {
    Temporada.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ message: 'Temporada no encontrada.' });
  });

  it('crear valida nombre obligatorio', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: {} });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El nombre es obligatorio.');
    expect(Temporada.create).not.toHaveBeenCalled();
  });

  it('crear crea la temporada y devuelve 201', async () => {
    const creada = { id: 5, nombre: '2026/27' };
    Temporada.create.mockResolvedValue(creada);
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: '2026/27' } });

    await promesa;

    expect(Temporada.create).toHaveBeenCalledWith({ nombre: '2026/27' });
    expect(res._status).toBe(201);
    expect(res._json).toEqual(creada);
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Temporada.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'X' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar guarda los cambios', async () => {
    const temporada = { id: 1, nombre: 'Viejo', save: vi.fn().mockResolvedValue() };
    Temporada.findOne.mockResolvedValue(temporada);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'Nuevo' } });

    await promesa;

    expect(temporada.nombre).toBe('Nuevo');
    expect(temporada.save).toHaveBeenCalled();
    expect(res._json).toEqual(temporada);
  });

  it('eliminar elimina y responde 204', async () => {
    Temporada.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });

    await promesa;

    expect(Temporada.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(res._status).toBe(204);
  });

  it('eliminar devuelve 404 si no encuentra nada', async () => {
    Temporada.destroy.mockResolvedValue(0);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
  });
});
