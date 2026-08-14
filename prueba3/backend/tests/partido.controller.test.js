import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Op } from 'sequelize';
import { Partido, PartidoJugador } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/partido.controller.js';

describe('Sección Partidos · partido.controller', () => {
  beforeEach(() => {
    Partido.findAll.mockReset();
    Partido.findByPk.mockReset();
    Partido.create.mockReset();
    Partido.destroy.mockReset();
    Partido.count.mockReset();
    PartidoJugador.destroy.mockReset();
    PartidoJugador.bulkCreate.mockReset();
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
    expect(res._json[0]).toEqual({ id: 1, id_equipo: 5, ids_jugadores: [] });
  });

  it('listar filtra por categoría, lugar y equipo', async () => {
    Partido.findAll.mockResolvedValue([]);
    const { promesa, res } = llamar(ctrl.listar, {
      query: { id_categoria: '2', id_lugar: '3', id_equipo: '5' }
    });

    await promesa;

    expect(Partido.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id_categoria: '2',
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
    expect(res._json).toEqual({ id: 3, id_equipo: 5, ids_jugadores: [] });
  });

  it('crear valida campos obligatorios', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { id_categoria: 1 } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Categoría, fecha y equipo son obligatorios.');
    expect(Partido.create).not.toHaveBeenCalled();
  });

  it('crear exige lugar si es local', async () => {
    const { promesa, res } = llamar(ctrl.crear, {
      body: { id_categoria: 1, fecha: '2026-01-01', id_equipo: 6, es_local: 1 }
    });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El lugar es obligatorio para partidos como local.');
    expect(Partido.create).not.toHaveBeenCalled();
  });

  it('crear rechaza duplicado: misma categoría y mismo día', async () => {
    Partido.count.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_categoria: 1, fecha: '2026-01-01', id_lugar: 2, id_equipo: 6 }
    });

    await promesa;

    expect(res._status).toBe(409);
    expect(res._json.message).toBe('Esta categoría ya tiene un partido ese día.');
    expect(Partido.create).not.toHaveBeenCalled();
  });

  it('crear rechaza duplicado de otra categoría', async () => {
    Partido.count.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_categoria: 2, fecha: '2026-01-01', id_lugar: 2, id_equipo: 6 }
    });

    await promesa;

    expect(res._status).toBe(409);
    expect(res._json.message).toBe('Esta categoría ya tiene un partido ese día.');
  });

  it('crear crea el partido como local por defecto y devuelve 201', async () => {
    Partido.count.mockResolvedValue(0);
    const creado = { id: 5, id_equipo: 6 };
    const completo = { id: 5, id_equipo: 6, categoria: null, lugar: null, equipo: null };
    Partido.create.mockResolvedValue(creado);
    Partido.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_categoria: 1, fecha: '2026-01-01', id_lugar: 2, id_equipo: 6 }
    });

    await promesa;

    expect(Partido.create).toHaveBeenCalledWith({
      id_categoria: 1, fecha: '2026-01-01', id_lugar: 2, id_equipo: 6, es_local: 1, id_usuario: 7, incidencias: undefined
    });
    expect(res._status).toBe(201);
    expect(res._json).toEqual({ id: 5, id_equipo: 6, categoria: null, lugar: null, equipo: null, ids_jugadores: [] });
  });

  it('crear como visitante deja el lugar en null', async () => {
    Partido.count.mockResolvedValue(0);
    const creado = { id: 7, id_equipo: 6 };
    const completo = { id: 7, id_equipo: 6, categoria: null, lugar: null, equipo: null };
    Partido.create.mockResolvedValue(creado);
    Partido.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_categoria: 1, fecha: '2026-01-01', id_equipo: 6, es_local: 0 }
    });

    await promesa;

    expect(Partido.create).toHaveBeenCalledWith(
      expect.objectContaining({ id_lugar: null, es_local: 0 })
    );
    expect(res._status).toBe(201);
  });

  it('crear guarda los convocados', async () => {
    Partido.count.mockResolvedValue(0);
    const creado = { id: 9, id_equipo: 6 };
    const completo = { id: 9, id_equipo: 6, categoria: null, lugar: null, equipo: null, convocados: [] };
    Partido.create.mockResolvedValue(creado);
    Partido.findByPk.mockResolvedValue(completo);
    const { promesa } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_categoria: 1, fecha: '2026-01-01', id_lugar: 2, id_equipo: 6, ids_jugadores: [3, 4] }
    });

    await promesa;

    expect(PartidoJugador.destroy).toHaveBeenCalledWith({ where: { id_partido: 9 } });
    expect(PartidoJugador.bulkCreate).toHaveBeenCalledWith([
      { id_partido: 9, id_jugador: 3 },
      { id_partido: 9, id_jugador: 4 }
    ]);
  });

  it('listar expone ids_jugadores desde los convocados', async () => {
    const partido = {
      id: 1, id_equipo: 5,
      convocados: [{ id_jugador: 3 }, { id_jugador: 4 }]
    };
    Partido.findAll.mockResolvedValue([partido]);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(res._json[0].ids_jugadores).toEqual([3, 4]);
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Partido.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { fecha: 'x' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar guarda los cambios', async () => {
    const partido = { id: 1, id_equipo: 5, save: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, id_equipo: 6, categoria: null, lugar: null, equipo: null };
    Partido.findByPk.mockResolvedValueOnce(partido).mockResolvedValueOnce(actualizado);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { id_equipo: 6 } });

    await promesa;

    expect(partido.id_equipo).toBe(6);
    expect(partido.save).toHaveBeenCalled();
    expect(res._json).toEqual({ id: 1, id_equipo: 6, categoria: null, lugar: null, equipo: null, ids_jugadores: [] });
  });

  it('actualizar reemplaza los convocados si vienen en el body', async () => {
    const partido = { id: 1, id_equipo: 5, save: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, id_equipo: 5, categoria: null, lugar: null, equipo: null, convocados: [] };
    Partido.findByPk.mockResolvedValueOnce(partido).mockResolvedValueOnce(actualizado);
    const { promesa } = llamar(ctrl.actualizar, {
      params: { id: '1' },
      body: { ids_jugadores: [7, 8] }
    });

    await promesa;

    expect(PartidoJugador.destroy).toHaveBeenCalledWith({ where: { id_partido: 1 } });
    expect(PartidoJugador.bulkCreate).toHaveBeenCalledWith([
      { id_partido: 1, id_jugador: 7 },
      { id_partido: 1, id_jugador: 8 }
    ]);
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
