import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Resultado } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/resultado.controller.js';

describe('Sección Resultados · resultado.controller', () => {
  beforeEach(() => {
    Resultado.findAll.mockReset();
    Resultado.findByPk.mockReset();
    Resultado.create.mockReset();
    Resultado.destroy.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve los resultados ordenados por id', async () => {
    const lista = [{ id: 1, resultado: '3-1' }];
    Resultado.findAll.mockResolvedValue(lista);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(Resultado.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ order: [['id', 'ASC']], include: expect.any(Array) })
    );
    expect(res._json).toEqual(lista);
  });

  it('listar filtra por id_partido si se pasa', async () => {
    Resultado.findAll.mockResolvedValue([]);
    const { promesa } = llamar(ctrl.listar, { query: { id_partido: '4' } });

    await promesa;

    expect(Resultado.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_partido: '4' } })
    );
  });

  it('obtener devuelve 404 si no existe', async () => {
    Resultado.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ message: 'Resultado no encontrado.' });
  });

  it('obtener devuelve el resultado por id', async () => {
    const resul = { id: 3, resultado: '2-0' };
    Resultado.findByPk.mockResolvedValue(resul);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '3' } });

    await promesa;

    expect(Resultado.findByPk).toHaveBeenCalledWith('3', expect.objectContaining({ include: expect.any(Array) }));
    expect(res._json).toEqual(resul);
  });

  it('crear valida el partido y el resultado obligatorios', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { id_partido: 1 } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El partido y el resultado son obligatorios.');
    expect(Resultado.create).not.toHaveBeenCalled();
  });

  it('crear crea el resultado y devuelve 201', async () => {
    const creado = { id: 5, id_partido: 2, resultado: '1-1' };
    const completo = { id: 5, id_partido: 2, resultado: '1-1', partido: { id: 2 } };
    Resultado.create.mockResolvedValue(creado);
    Resultado.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { id_partido: 2, resultado: '1-1', incidencias: 'Ninguna' }
    });

    await promesa;

    expect(Resultado.create).toHaveBeenCalledWith({ id_partido: 2, resultado: '1-1', incidencias: 'Ninguna' });
    expect(res._status).toBe(201);
    expect(res._json).toEqual(completo);
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Resultado.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { resultado: 'x' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar guarda los cambios', async () => {
    const resultado = { id: 1, resultado: '1-0', save: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, resultado: '2-0', partido: { id: 2 } };
    Resultado.findByPk.mockResolvedValueOnce(resultado).mockResolvedValueOnce(actualizado);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { resultado: '2-0' } });

    await promesa;

    expect(resultado.resultado).toBe('2-0');
    expect(resultado.save).toHaveBeenCalled();
    expect(res._json).toEqual(actualizado);
  });

  it('eliminar elimina y responde 204', async () => {
    Resultado.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });

    await promesa;

    expect(Resultado.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(res._status).toBe(204);
  });

  it('eliminar devuelve 404 si no encuentra nada', async () => {
    Resultado.destroy.mockResolvedValue(0);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
  });
});