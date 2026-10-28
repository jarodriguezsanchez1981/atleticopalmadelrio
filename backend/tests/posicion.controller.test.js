import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Posicion } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/posicion.controller.js';

describe('Sección Posición · posicion.controller', () => {
  beforeEach(() => {
    Posicion.findAll.mockReset();
    Posicion.findOne.mockReset();
    Posicion.create.mockReset();
    Posicion.destroy.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve las posiciones ordenadas por nombre ASC', async () => {
    const posiciones = [{ id: 1, nombre: 'Portero', alias: 'POR' }];
    Posicion.findAll.mockResolvedValue(posiciones);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(Posicion.findAll).toHaveBeenCalledWith({ order: [['nombre', 'ASC']] });
    expect(res._json).toEqual(posiciones);
  });

  it('obtener devuelve la posición por id', async () => {
    const posicion = { id: 3, nombre: 'Defensa', alias: 'DEF' };
    Posicion.findOne.mockResolvedValue(posicion);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '3' } });

    await promesa;

    expect(Posicion.findOne).toHaveBeenCalledWith({ where: { id: '3' } });
    expect(res._json).toEqual(posicion);
  });

  it('obtener devuelve 404 si no existe', async () => {
    Posicion.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ message: 'Posición no encontrada.' });
  });

  it('crear valida nombre obligatorio', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: {} });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El nombre es obligatorio.');
    expect(Posicion.create).not.toHaveBeenCalled();
  });

  it('crear crea la posición con nombre y alias y devuelve 201', async () => {
    const creado = { id: 5, nombre: 'Delantero', alias: 'DEL' };
    Posicion.create.mockResolvedValue(creado);
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'Delantero', alias: 'DEL' } });

    await promesa;

    expect(Posicion.create).toHaveBeenCalledWith({ nombre: 'Delantero', alias: 'DEL' });
    expect(res._status).toBe(201);
    expect(res._json).toEqual(creado);
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Posicion.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'X' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar guarda los cambios', async () => {
    const posicion = { id: 1, nombre: 'Viejo', alias: 'VIE', save: vi.fn().mockResolvedValue() };
    Posicion.findOne.mockResolvedValue(posicion);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'Nuevo', alias: 'NUE' } });

    await promesa;

    expect(posicion.nombre).toBe('Nuevo');
    expect(posicion.alias).toBe('NUE');
    expect(posicion.save).toHaveBeenCalled();
    expect(res._json).toEqual(posicion);
  });

  it('eliminar elimina y responde 204', async () => {
    Posicion.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });

    await promesa;

    expect(Posicion.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(res._status).toBe(204);
  });

  it('eliminar devuelve 404 si no encuentra nada', async () => {
    Posicion.destroy.mockResolvedValue(0);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
  });
});
