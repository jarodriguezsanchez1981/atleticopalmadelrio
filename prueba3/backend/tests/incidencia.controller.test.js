import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Incidencia, Jugador, Entrenador, Delegado } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/incidencia.controller.js';

describe('Sección Incidencias · incidencia.controller', () => {
  beforeEach(() => {
    Incidencia.findAll.mockReset();
    Incidencia.findByPk.mockReset();
    Incidencia.create.mockReset();
    Incidencia.destroy.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve las incidencias ordenadas por fecha', async () => {
    const lista = [{ id: 1, incidencias: 'x' }];
    Incidencia.findAll.mockResolvedValue(lista);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(Incidencia.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ order: [['fecha', 'ASC']], include: expect.any(Array) })
    );
    expect(res._json).toEqual(lista);
  });

  it('obtener devuelve 404 si no existe', async () => {
    Incidencia.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ message: 'Incidencia no encontrada.' });
  });

  it('obtener devuelve la incidencia por id', async () => {
    const inc = { id: 3, incidencias: 'y' };
    Incidencia.findByPk.mockResolvedValue(inc);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '3' } });

    await promesa;

    expect(Incidencia.findByPk).toHaveBeenCalledWith('3', expect.objectContaining({ include: expect.any(Array) }));
    expect(res._json).toEqual(inc);
  });

  it('crear valida la fecha obligatoria', async () => {
    const { promesa, res } = llamar(ctrl.crear, {
      body: { id_entrenador: 1, incidencias: 'x' }
    });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('La fecha es obligatoria.');
    expect(Incidencia.create).not.toHaveBeenCalled();
  });

  it('crear valida al menos una referencia', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { fecha: '2026-01-01' } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Debe indicarse al menos una categoría, jugador, entrenador o delegado.');
    expect(Incidencia.create).not.toHaveBeenCalled();
  });

  it('crear crea la incidencia con el usuario autenticado y devuelve 201', async () => {
    const creada = { id: 5, id_jugador: 3 };
    const completa = { id: 5, id_jugador: 3, jugador: { id: 3 } };
    Incidencia.create.mockResolvedValue(creada);
    Incidencia.findByPk.mockResolvedValue(completa);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_jugador: 3, incidencias: 'Warning', fecha: '2026-01-01' }
    });

    await promesa;

    expect(Incidencia.create).toHaveBeenCalledWith({
      id_categoria: null, id_jugador: 3, id_entrenador: null, id_delegado: null, id_usuario: 7, incidencias: 'Warning', fecha: '2026-01-01'
    });
    expect(res._status).toBe(201);
    expect(res._json).toEqual(completa);
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Incidencia.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { fecha: 'x' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar guarda los cambios', async () => {
    const incidencia = { id: 1, id_jugador: 1, save: vi.fn().mockResolvedValue() };
    const actualizada = { id: 1, id_jugador: 2, jugador: { id: 2 } };
    Incidencia.findByPk.mockResolvedValueOnce(incidencia).mockResolvedValueOnce(actualizada);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { id_jugador: 2 } });

    await promesa;

    expect(incidencia.id_jugador).toBe(2);
    expect(incidencia.save).toHaveBeenCalled();
    expect(res._json).toEqual(actualizada);
  });

  it('eliminar elimina y responde 204', async () => {
    Incidencia.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });

    await promesa;

    expect(Incidencia.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(res._status).toBe(204);
  });

  it('eliminar devuelve 404 si no encuentra nada', async () => {
    Incidencia.destroy.mockResolvedValue(0);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
  });
});