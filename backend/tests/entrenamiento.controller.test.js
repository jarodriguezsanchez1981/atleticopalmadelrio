import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Op } from 'sequelize';
import { Entrenamiento, Plantilla, Categoria } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/entrenamiento.controller.js';

describe('Sección Entrenamientos · entrenamiento.controller', () => {
  beforeEach(() => {
    Entrenamiento.findAll.mockReset();
    Entrenamiento.findByPk.mockReset();
    Entrenamiento.create.mockReset();
    Entrenamiento.destroy.mockReset();
    Entrenamiento.count.mockReset();
    Plantilla.findOne.mockReset();
    Categoria.findOne.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve los entrenamientos sin filtros', async () => {
    const entrenamientos = [{ id: 1, fecha: '2026-01-01' }];
    Entrenamiento.findAll.mockResolvedValue(entrenamientos);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(Entrenamiento.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ order: [['fecha', 'ASC']], include: expect.any(Array) })
    );
    expect(res._json[0]).toEqual({ id: 1, fecha: '2026-01-01' });
  });

  it('listar filtra por plantilla y lugar', async () => {
    Entrenamiento.findAll.mockResolvedValue([]);
    const { promesa, res } = llamar(ctrl.listar, { query: { id_plantilla: '2', id_lugar: '3' } });

    await promesa;

    expect(Entrenamiento.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_plantilla: '2', id_lugar: '3' } })
    );
  });

  it('listar filtra por rango de fechas', async () => {
    Entrenamiento.findAll.mockResolvedValue([]);
    const { promesa, res } = llamar(ctrl.listar, { query: { desde: '2026-01-01', hasta: '2026-12-31' } });

    await promesa;

    const llamada = Entrenamiento.findAll.mock.calls[0][0];
    expect(llamada.where.fecha).toBeDefined();
    expect(llamada.where.fecha[Op.gte]).toEqual(new Date('2026-01-01'));
    expect(llamada.where.fecha[Op.lte]).toEqual(new Date('2026-12-31'));
  });

  it('obtener devuelve 404 si no existe', async () => {
    Entrenamiento.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ message: 'Entrenamiento no encontrado.' });
  });

  it('obtener devuelve el entrenamiento por id', async () => {
    const entrenamiento = { id: 3, fecha: '2026-01-01' };
    Entrenamiento.findByPk.mockResolvedValue(entrenamiento);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '3' } });

    await promesa;

    expect(Entrenamiento.findByPk).toHaveBeenCalledWith('3', expect.objectContaining({ include: expect.any(Array) }));
    expect(res._json).toEqual({ id: 3, fecha: '2026-01-01' });
  });

  it('crear valida campos obligatorios', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { id_plantilla: 1 } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Plantilla, fecha y lugar son obligatorios.');
    expect(Entrenamiento.create).not.toHaveBeenCalled();
  });

  it('crear un registro base con el usuario autenticado', async () => {
    const creado = { id: 5 };
    const completo = { id: 5, plantilla: null, lugar: null };
    Entrenamiento.findAll.mockResolvedValue([]);
    Entrenamiento.create.mockResolvedValue(creado);
    Entrenamiento.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_plantilla: 1, fecha: '2026-01-01', id_lugar: 2 }
    });

    await promesa;

    expect(Entrenamiento.create).toHaveBeenCalledWith({
      id_plantilla: 1, fecha: '2026-01-01', hasta: null, id_lugar: 2, id_usuario: 7, recurrente: 0
    });
    expect(res._status).toBe(201);
    expect(res._json).toEqual({ id: 5, plantilla: null, lugar: null });
  });

  it('crear rechaza duplicado: misma plantilla y misma hora', async () => {
    Plantilla.findOne.mockResolvedValue({ id: 1, categoria: { id: 1, tiempoentrenamiento: 60 } });
    Entrenamiento.findAll.mockResolvedValue([
      { id: 9, fecha: new Date('2026-01-01T10:00:00'), plantilla: { categoria: { id: 1, tiempoentrenamiento: 60 } } }
    ]);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_plantilla: 1, fecha: '2026-01-01T10:00:00', id_lugar: 2 }
    });

    await promesa;

    expect(res._status).toBe(409);
    expect(res._json.message).toBe('Esta plantilla ya tiene un entrenamiento a esa hora.');
    expect(Entrenamiento.create).not.toHaveBeenCalled();
  });

  it('crear permite la misma plantilla a otra hora o día', async () => {
    Plantilla.findOne.mockResolvedValue({ id: 1, categoria: { id: 1, tiempoentrenamiento: 60 } });
    Entrenamiento.findAll.mockResolvedValue([]);
    const creado = { id: 5 };
    const completo = { id: 5, plantilla: null, lugar: null };
    Entrenamiento.create.mockResolvedValue(creado);
    Entrenamiento.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_plantilla: 1, fecha: '2026-01-02T16:00:00', id_lugar: 2 }
    });

    await promesa;

    expect(Entrenamiento.create).toHaveBeenCalledWith(
      expect.objectContaining({ id_plantilla: 1, fecha: '2026-01-02T16:00:00' })
    );
    expect(res._status).toBe(201);
  });

  it('crear rechaza si el entrenamiento anterior aún no ha terminado (tiempoentrenamiento)', async () => {
    Plantilla.findOne.mockResolvedValue({ id: 1, categoria: { id: 1, tiempoentrenamiento: 60 } });
    Entrenamiento.findAll.mockResolvedValue([
      { id: 9, fecha: new Date('2026-01-01T10:00:00'), plantilla: { categoria: { id: 1, tiempoentrenamiento: 60 } } }
    ]);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_plantilla: 1, fecha: '2026-01-01T10:30:00', id_lugar: 2 }
    });

    await promesa;

    expect(res._status).toBe(409);
    expect(res._json.message).toBe('Esta plantilla ya tiene un entrenamiento a esa hora.');
    expect(Entrenamiento.create).not.toHaveBeenCalled();
  });

  it('crear permite cuando el entrenamiento anterior ya ha terminado', async () => {
    Plantilla.findOne.mockResolvedValue({ id: 1, categoria: { id: 1, tiempoentrenamiento: 60 } });
    Entrenamiento.findAll.mockResolvedValue([
      { id: 9, fecha: new Date('2026-01-01T10:00:00'), plantilla: { categoria: { id: 1, tiempoentrenamiento: 60 } } }
    ]);
    const creado = { id: 6 };
    const completo = { id: 6, plantilla: null, lugar: null };
    Entrenamiento.create.mockResolvedValue(creado);
    Entrenamiento.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_plantilla: 1, fecha: '2026-01-01T11:00:00', id_lugar: 2 }
    });

    await promesa;

    expect(res._status).toBe(201);
  });

  it('actualizar rechaza duplicado al cambiar de plantilla o fecha', async () => {
    const entrenamiento = { id: 1, id_plantilla: 1, fecha: '2026-01-01T10:00:00', recurrente: 0, id_lugar: 2, save: vi.fn().mockResolvedValue() };
    Entrenamiento.findByPk.mockResolvedValue(entrenamiento);
    Plantilla.findOne.mockResolvedValue({ id: 1, categoria: { id: 1, tiempoentrenamiento: 60 } });
    Entrenamiento.findAll.mockResolvedValue([
      { id: 2, fecha: new Date('2026-01-03T10:00:00'), plantilla: { categoria: { id: 1, tiempoentrenamiento: 60 } } }
    ]);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' },
      body: { fecha: '2026-01-03T10:00:00' }
    });

    await promesa;

    expect(res._status).toBe(409);
    expect(res._json.message).toBe('Esta plantilla ya tiene un entrenamiento a esa hora.');
    expect(entrenamiento.save).not.toHaveBeenCalled();
  });

  it('actualizar permite mantener su propia plantilla y fecha sin duplicado', async () => {
    const entrenamiento = { id: 1, id_plantilla: 1, fecha: '2026-01-01T10:00:00', recurrente: 0, id_lugar: 2, save: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, id_lugar: 2, plantilla: null, lugar: null };
    Entrenamiento.findByPk.mockResolvedValueOnce(entrenamiento).mockResolvedValueOnce(actualizado);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' },
      body: { id_lugar: 3 }
    });

    await promesa;

    expect(entrenamiento.id_lugar).toBe(3);
    expect(res._status).toBe(200);
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Entrenamiento.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { fecha: 'x' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar guarda los cambios', async () => {
    const entrenamiento = { id: 1, id_lugar: 1, save: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, id_lugar: 2, plantilla: null, lugar: null };
    Entrenamiento.findByPk.mockResolvedValueOnce(entrenamiento).mockResolvedValueOnce(actualizado);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { id_lugar: 2 } });

    await promesa;

    expect(entrenamiento.id_lugar).toBe(2);
    expect(entrenamiento.save).toHaveBeenCalled();
    expect(res._json).toEqual({ id: 1, id_lugar: 2, plantilla: null, lugar: null });
  });

  it('eliminar elimina y responde 204', async () => {
    Entrenamiento.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });

    await promesa;

    expect(Entrenamiento.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(res._status).toBe(204);
  });

  it('eliminar devuelve 404 si no encuentra nada', async () => {
    Entrenamiento.destroy.mockResolvedValue(0);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
  });
});