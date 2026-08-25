import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Op } from 'sequelize';
import { Partido, Plantilla, Categoria, Resultado } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/partido.controller.js';

describe('Sección Partidos · partido.controller', () => {
  beforeEach(() => {
    Partido.findAll.mockReset();
    Partido.findByPk.mockReset();
    Partido.create.mockReset();
    Partido.destroy.mockReset();
    Partido.count.mockReset();
    Resultado.destroy.mockReset();
    Resultado.create.mockReset();
    Resultado.findOne.mockReset();
    Plantilla.findOne.mockReset();
    Categoria.findOne.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve los partidos sin filtros', async () => {
    const partidos = [{ id: 1, id_equipo: 5 }];
    Partido.findAll.mockResolvedValue(partidos);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(Partido.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ order: [['fecha', 'ASC']], include: expect.any(Array) })
    );
    expect(res._json[0]).toEqual({ id: 1, id_equipo: 5 });
  });

  it('listar filtra por plantilla, lugar y equipo', async () => {
    Partido.findAll.mockResolvedValue([]);
    const { promesa, res } = llamar(ctrl.listar, {
      query: { id_plantilla: '2', id_lugar: '3', id_equipo: '5' }
    });

    await promesa;

    expect(Partido.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id_plantilla: '2',
          id_lugar: '3',
          id_equipo: '5'
        }
      })
    );
  });

  it('listar filtra por rango de fechas', async () => {
    Partido.findAll.mockResolvedValue([]);
    const { promesa, res } = llamar(ctrl.listar, {
      query: { desde: '2026-01-01', hasta: '2026-12-31' }
    });

    await promesa;

    const llamada = Partido.findAll.mock.calls[0][0];
    expect(llamada.where.fecha).toBeDefined();
    expect(llamada.where.fecha[Op.gte]).toEqual(new Date('2026-01-01'));
    expect(llamada.where.fecha[Op.lte]).toEqual(new Date('2026-12-31'));
  });

  it('obtener devuelve 404 si no existe', async () => {
    Partido.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ message: 'Partido no encontrado.' });
  });

  it('obtener devuelve el partido por id', async () => {
    const partido = { id: 3, id_equipo: 5 };
    Partido.findByPk.mockResolvedValue(partido);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '3' } });

    await promesa;

    expect(Partido.findByPk).toHaveBeenCalledWith('3', expect.objectContaining({ include: expect.any(Array) }));
    expect(res._json).toEqual({ id: 3, id_equipo: 5 });
  });

  it('crear valida campos obligatorios', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { id_plantilla: 1 } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Plantilla, fecha y equipo son obligatorios.');
    expect(Partido.create).not.toHaveBeenCalled();
  });

  it('crear permite local sin lugar (id_lugar opcional)', async () => {
    Partido.count.mockResolvedValue(0);
    Partido.findAll.mockResolvedValue([]);
    const creado = { id: 5, id_equipo: 6 };
    const completo = { id: 5, id_equipo: 6, plantilla: null, lugar: null, equipo: null };
    Partido.create.mockResolvedValue(creado);
    Partido.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_plantilla: 1, fecha: '2026-01-01', id_equipo: 6, es_local: 1 }
    });

    await promesa;

    expect(Partido.create).toHaveBeenCalledWith(
      expect.objectContaining({ id_lugar: null, es_local: 1 })
    );
    expect(res._status).toBe(201);
  });

  it('crear rechaza duplicado: misma plantilla y mismo día', async () => {
    Partido.count.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_plantilla: 1, fecha: '2026-01-01', id_lugar: 2, id_equipo: 6 }
    });

    await promesa;

    expect(res._status).toBe(409);
    expect(res._json.message).toBe('Esta plantilla ya tiene un partido ese día.');
    expect(Partido.create).not.toHaveBeenCalled();
  });

  it('crear rechaza duplicado de otra plantilla', async () => {
    Partido.count.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_plantilla: 2, fecha: '2026-01-01', id_lugar: 2, id_equipo: 6 }
    });

    await promesa;

    expect(res._status).toBe(409);
    expect(res._json.message).toBe('Esta plantilla ya tiene un partido ese día.');
  });

  it('crear rechaza si la plantilla jugó hace menos de 72 horas', async () => {
    Partido.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_plantilla: 1, fecha: '2026-01-03T10:00:00', id_lugar: 2, id_equipo: 6 }
    });

    await promesa;

    expect(res._status).toBe(409);
    expect(res._json.message).toBe('Esta plantilla jugó hace menos de 72 horas.');
    expect(Partido.create).not.toHaveBeenCalled();
  });

  it('crear permite si pasaron más de 72 horas', async () => {
    Partido.count.mockResolvedValue(0);
    Partido.findAll.mockResolvedValue([]);
    const creado = { id: 5, id_equipo: 6 };
    const completo = { id: 5, id_equipo: 6, plantilla: null, lugar: null, equipo: null };
    Partido.create.mockResolvedValue(creado);
    Partido.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_plantilla: 1, fecha: '2026-01-05T10:00:00', id_lugar: 2, id_equipo: 6 }
    });

    await promesa;

    expect(res._status).toBe(201);
  });

  it('crear crea el partido como local por defecto y devuelve 201', async () => {
    Partido.count.mockResolvedValue(0);
    Partido.findAll.mockResolvedValue([]);
    const creado = { id: 5, id_equipo: 6 };
    const completo = { id: 5, id_equipo: 6, plantilla: null, lugar: null, equipo: null };
    Partido.create.mockResolvedValue(creado);
    Partido.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_plantilla: 1, fecha: '2026-01-01T10:00:00', id_lugar: 2, id_equipo: 6 }
    });

    await promesa;

    expect(Partido.create).toHaveBeenCalledWith({
      id_plantilla: 1, fecha: '2026-01-01T10:00:00', id_lugar: 2, id_jornada: null, id_equipo: 6, es_local: 1, id_usuario: 7, incidencias: undefined
    });
    expect(res._status).toBe(201);
    expect(res._json).toEqual({ id: 5, id_equipo: 6, plantilla: null, lugar: null, equipo: null });
  });

  it('crear rechaza si el lugar está ocupado a esa hora', async () => {
    Partido.count.mockResolvedValue(0);
    Plantilla.findOne.mockResolvedValue({ id: 1, categoria: { id: 1, tiempopartido: 90 } });
    Partido.findAll.mockResolvedValue([
      { id: 30, fecha: new Date('2026-01-01T09:00:00'), plantilla: { categoria: { id: 3, tiempopartido: 90 } } }
    ]);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_plantilla: 1, fecha: '2026-01-01T10:00:00', id_lugar: 2, id_equipo: 6 }
    });

    await promesa;

    expect(res._status).toBe(409);
    expect(res._json.message).toBe('Ese lugar ya está ocupado a esa hora por otro partido.');
    expect(Partido.create).not.toHaveBeenCalled();
  });

  it('crear permite si el lugar está libre aunque haya otro en otro lugar', async () => {
    Partido.count.mockResolvedValue(0);
    Plantilla.findOne.mockResolvedValue({ id: 1, categoria: { id: 1, tiempopartido: 90 } });
    Partido.findAll.mockResolvedValue([]);
    const creado = { id: 6, id_equipo: 6 };
    const completo = { id: 6, id_equipo: 6, plantilla: null, lugar: null, equipo: null };
    Partido.create.mockResolvedValue(creado);
    Partido.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_plantilla: 1, fecha: '2026-01-01T10:00:00', id_lugar: 2, id_equipo: 6 }
    });

    await promesa;

    expect(res._status).toBe(201);
  });

  it('crear permite si el lugar ocupado termina antes de la nueva hora', async () => {
    Partido.count.mockResolvedValue(0);
    Plantilla.findOne.mockResolvedValue({ id: 1, categoria: { id: 1, tiempopartido: 90 } });
    Partido.findAll.mockResolvedValue([
      { id: 30, fecha: new Date('2026-01-01T08:00:00'), plantilla: { categoria: { id: 3, tiempopartido: 60 } } }
    ]);
    const creado = { id: 6, id_equipo: 6 };
    const completo = { id: 6, id_equipo: 6, plantilla: null, lugar: null, equipo: null };
    Partido.create.mockResolvedValue(creado);
    Partido.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_plantilla: 1, fecha: '2026-01-01T10:00:00', id_lugar: 2, id_equipo: 6 }
    });

    await promesa;

    expect(res._status).toBe(201);
  });

  it('crear como visitante deja el lugar en null', async () => {
    Partido.count.mockResolvedValue(0);
    const creado = { id: 7, id_equipo: 6 };
    const completo = { id: 7, id_equipo: 6, plantilla: null, lugar: null, equipo: null };
    Partido.create.mockResolvedValue(creado);
    Partido.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_plantilla: 1, fecha: '2026-01-01', id_equipo: 6, es_local: 0 }
    });

    await promesa;

    expect(Partido.create).toHaveBeenCalledWith(
      expect.objectContaining({ id_lugar: null, es_local: 0 })
    );
    expect(res._status).toBe(201);
  });

  it('crear guarda el resultado en la tabla resultados', async () => {
    Partido.count.mockResolvedValue(0);
    Partido.findAll.mockResolvedValue([]);
    const creado = { id: 10, id_equipo: 6 };
    const completo = { id: 10, id_equipo: 6, plantilla: null, lugar: null, equipo: null };
    Partido.create.mockResolvedValue(creado);
    Partido.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_plantilla: 1, fecha: '2026-01-01T10:00:00', id_lugar: 2, id_equipo: 6, resultado: '2-1' }
    });

    await promesa;

    expect(Resultado.destroy).toHaveBeenCalledWith({ where: { id_partido: 10 } });
    expect(Resultado.create).toHaveBeenCalledWith({
      id_partido: 10, resultado: '2-1', incidencias: null
    });
    expect(res._status).toBe(201);
  });

  it('crear sin resultado no crea filas en resultados', async () => {
    Partido.count.mockResolvedValue(0);
    Partido.findAll.mockResolvedValue([]);
    const creado = { id: 11, id_equipo: 6 };
    const completo = { id: 11, id_equipo: 6, plantilla: null, lugar: null, equipo: null };
    Partido.create.mockResolvedValue(creado);
    Partido.findByPk.mockResolvedValue(completo);
    const { promesa } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_plantilla: 1, fecha: '2026-01-01T10:00:00', id_lugar: 2, id_equipo: 6 }
    });

    await promesa;

    expect(Resultado.destroy).toHaveBeenCalledWith({ where: { id_partido: 11 } });
    expect(Resultado.create).not.toHaveBeenCalled();
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Partido.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { fecha: 'x' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar guarda los cambios', async () => {
    const partido = { id: 1, id_equipo: 5, save: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, id_equipo: 6, plantilla: null, lugar: null, equipo: null };
    Partido.findByPk.mockResolvedValueOnce(partido).mockResolvedValueOnce(actualizado);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { id_equipo: 6 } });

    await promesa;

    expect(partido.id_equipo).toBe(6);
    expect(partido.save).toHaveBeenCalled();
    expect(res._json).toEqual({ id: 1, id_equipo: 6, plantilla: null, lugar: null, equipo: null });
  });

  it('actualizar guarda el resultado en la tabla resultados', async () => {
    const partido = { id: 1, id_equipo: 5, save: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, id_equipo: 5, plantilla: null, lugar: null, equipo: null };
    Partido.findByPk.mockResolvedValueOnce(partido).mockResolvedValueOnce(actualizado);
    const { promesa } = llamar(ctrl.actualizar, {
      params: { id: '1' },
      body: { resultado: '3-0', resultado_incidencias: 'Sin novedad' }
    });

    await promesa;

    expect(Resultado.destroy).toHaveBeenCalledWith({ where: { id_partido: 1 } });
    expect(Resultado.create).toHaveBeenCalledWith({
      id_partido: 1, resultado: '3-0', incidencias: 'Sin novedad'
    });
  });

  it('actualizar con resultado vacío borra el resultado existente', async () => {
    const partido = { id: 1, id_equipo: 5, save: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, id_equipo: 5, plantilla: null, lugar: null, equipo: null };
    Partido.findByPk.mockResolvedValueOnce(partido).mockResolvedValueOnce(actualizado);
    const { promesa } = llamar(ctrl.actualizar, {
      params: { id: '1' },
      body: { resultado: '' }
    });

    await promesa;

    expect(Resultado.destroy).toHaveBeenCalledWith({ where: { id_partido: 1 } });
    expect(Resultado.create).not.toHaveBeenCalled();
  });

  it('serialize expone resultado_valor y resultado_incidencias desde resultados', async () => {
    const partido = {
      id: 1, id_equipo: 5,
      Resultados: [{ id: 7, resultado: '2-1', incidencias: null }]
    };
    Partido.findAll.mockResolvedValue([partido]);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(res._json[0].resultado_valor).toBe('2-1');
    expect(res._json[0].resultado_incidencias).toBeNull();
  });

  it('actualizar rechaza si al cambiar de fecha el lugar está ocupado', async () => {
    const partido = { id: 1, id_equipo: 5, es_local: 1, id_lugar: 2, id_plantilla: 1, fecha: '2026-01-01T09:00:00', save: vi.fn().mockResolvedValue() };
    Partido.findByPk.mockResolvedValue(partido);
    Partido.count.mockResolvedValue(0);
    Plantilla.findOne.mockResolvedValue({ id: 1, categoria: { id: 1, tiempopartido: 90 } });
    Partido.findAll.mockResolvedValue([
      { id: 2, fecha: new Date('2026-01-05T10:00:00'), plantilla: { categoria: { id: 1, tiempopartido: 90 } } }
    ]);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' },
      body: { fecha: '2026-01-05T10:00:00' }
    });

    await promesa;

    expect(res._status).toBe(409);
    expect(res._json.message).toBe('Ese lugar ya está ocupado a esa hora por otro partido.');
    expect(partido.save).not.toHaveBeenCalled();
  });

  it('actualizar permite mover la fecha si el lugar queda libre', async () => {
    const partido = { id: 1, id_equipo: 5, es_local: 1, id_lugar: 2, id_plantilla: 1, fecha: '2026-01-01T09:00:00', save: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, id_equipo: 5, es_local: 1, id_lugar: 2, plantilla: null, lugar: null, equipo: null };
    Partido.findByPk.mockResolvedValueOnce(partido).mockResolvedValueOnce(actualizado);
    Partido.count.mockResolvedValue(0);
    Plantilla.findOne.mockResolvedValue({ id: 1, categoria: { id: 1, tiempopartido: 90 } });
    Partido.findAll.mockResolvedValue([]);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' },
      body: { fecha: '2026-01-05T10:00:00' }
    });

    await promesa;

    expect(partido.fecha).toBe('2026-01-05T10:00:00');
    expect(res._status).toBe(200);
  });

  it('eliminar elimina y responde 204', async () => {
    Partido.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });

    await promesa;

    expect(Partido.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(res._status).toBe(204);
  });

  it('eliminar devuelve 404 si no encuentra nada', async () => {
    Partido.destroy.mockResolvedValue(0);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
  });
});