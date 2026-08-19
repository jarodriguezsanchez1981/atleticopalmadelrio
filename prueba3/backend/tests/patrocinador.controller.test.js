import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Patrocinador } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/patrocinador.controller.js';

describe('Sección Patrocinadores · patrocinador.controller', () => {
  beforeEach(() => {
    Patrocinador.findAll.mockReset();
    Patrocinador.findOne.mockReset();
    Patrocinador.create.mockReset();
    Patrocinador.destroy.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve los patrocinadores ordenados por orden ASC', async () => {
    const patrocinadores = [{ id: 1, nombre: 'URBSYER', orden: 1 }];
    Patrocinador.findAll.mockResolvedValue(patrocinadores);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(Patrocinador.findAll).toHaveBeenCalledWith({ order: [['orden', 'ASC']] });
    expect(res._json).toEqual(patrocinadores);
  });

  it('obtener devuelve el patrocinador por id', async () => {
    const patrocinador = { id: 3, nombre: 'URBSYER', orden: 2 };
    Patrocinador.findOne.mockResolvedValue(patrocinador);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '3' } });

    await promesa;

    expect(Patrocinador.findOne).toHaveBeenCalledWith({ where: { id: '3' } });
    expect(res._json).toEqual(patrocinador);
  });

  it('obtener devuelve 404 si no existe', async () => {
    Patrocinador.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ message: 'Patrocinador no encontrado.' });
  });

  it('crear valida nombre obligatorio', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { orden: 1 } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El nombre es obligatorio.');
    expect(Patrocinador.create).not.toHaveBeenCalled();
  });

  it('crear valida tipo obligatorio', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'X', orden: 5, tipo: 'espóndor' } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El tipo debe ser principal, oficial o colaborador.');
    expect(Patrocinador.create).not.toHaveBeenCalled();
  });

  it('crear valida orden fuera de rango', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'X', orden: 51 } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El orden debe ser un número entre 1 y 50.');
  });

  it('crear rechaza un orden ya registrado', async () => {
    Patrocinador.findOne.mockResolvedValue({ id: 2, orden: 3 });
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'X', tipo: 'oficial', orden: 3 } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Ese orden ya está en uso por otro patrocinador.');
    expect(Patrocinador.create).not.toHaveBeenCalled();
  });

  it('crear crea el patrocinador y devuelve 201', async () => {
    Patrocinador.findOne.mockResolvedValue(null);
    const creado = { id: 5, nombre: 'URBSYER', tipo: 'oficial', imagen: null, orden: 5 };
    Patrocinador.create.mockResolvedValue(creado);
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'URBSYER', tipo: 'oficial', orden: 5 } });

    await promesa;

    expect(Patrocinador.create).toHaveBeenCalledWith({ nombre: 'URBSYER', imagen: null, orden: 5, tipo: 'oficial' });
    expect(res._status).toBe(201);
    expect(res._json).toEqual(creado);
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Patrocinador.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'X' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar rechaza cambiar a un orden en uso', async () => {
    const patrocinador = { id: 1, orden: 2, save: vi.fn() };
    Patrocinador.findOne.mockResolvedValueOnce(patrocinador).mockResolvedValueOnce({ id: 9, orden: 4 });
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { orden: 4 } });

    await promesa;

    expect(res._status).toBe(400);
    expect(patrocinador.save).not.toHaveBeenCalled();
  });

  it('actualizar guarda los cambios', async () => {
    const patrocinador = { id: 1, nombre: 'Viejo', orden: 2, save: vi.fn().mockResolvedValue() };
    Patrocinador.findOne.mockResolvedValueOnce(patrocinador).mockResolvedValueOnce(patrocinador);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'Nuevo', tipo: 'colaborador', orden: 2 } });

    await promesa;

    expect(patrocinador.nombre).toBe('Nuevo');
    expect(patrocinador.tipo).toBe('colaborador');
    expect(patrocinador.save).toHaveBeenCalled();
    expect(res._json).toEqual(patrocinador);
  });

  it('eliminar elimina y responde 204', async () => {
    Patrocinador.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });

    await promesa;

    expect(Patrocinador.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(res._status).toBe(204);
  });

  it('eliminar devuelve 404 si no encuentra nada', async () => {
    Patrocinador.destroy.mockResolvedValue(0);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
  });
});
