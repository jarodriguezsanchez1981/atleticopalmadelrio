import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Op } from 'sequelize';
import { Partido, PartidoJugador, Plantilla, Equipo, Sancion } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/jornada.controller.js';

describe('Sección Jornadas · jornada.controller (leyendo de partidos)', () => {
  beforeEach(() => {
    Partido.findAll.mockReset();
    Partido.findOne.mockReset();
    Partido.create.mockReset();
    Partido.destroy.mockReset();
    PartidoJugador.destroy.mockReset();
    PartidoJugador.bulkCreate.mockReset();
    Plantilla.findOne.mockReset();
    Equipo.findOne.mockReset();
    Sancion.findOne.mockReset();
    Sancion.create.mockReset();
    Sancion.destroy.mockReset();
    Sancion.save.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve los partidos con jornada asignada, filtrados', async () => {
    Partido.findAll.mockResolvedValue([{ id: 1, jornada: 1, fecha: '2026-01-01T00:00:00' }]);
    const { promesa, res } = llamar(ctrl.listar, { query: { id_plantilla: '2' } });
    await promesa;
    expect(res._json).toHaveLength(1);
    const where = Partido.findAll.mock.calls[0][0].where;
    expect(where).toMatchObject({ id_plantilla: '2', jornada: { [Op.not]: null } });
  });

  it('obtener devuelve 404 si no existe', async () => {
    Partido.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });
    await promesa;
    expect(res._status).toBe(404);
  });

  it('obtener devuelve el partido con sus jugadores convocados', async () => {
    const convocados = [{ id_jugador: 5, es_local: true, goles: 1 }];
    Partido.findOne.mockResolvedValue({ id: 1, fecha: '2026-01-01T00:00:00', partidoJugadores: convocados });
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '1' } });
    await promesa;
    expect(res._json.partidoJugadores).toEqual(convocados);
  });

  it('crear valida campos obligatorios', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { id_plantilla: 1 } });
    await promesa;
    expect(res._status).toBe(400);
    expect(Partido.create).not.toHaveBeenCalled();
  });

  it('crear rechaza equipos iguales', async () => {
    const { promesa, res } = llamar(ctrl.crear, {
      body: { id_plantilla: 1, id_equipo_local: 5, id_equipo_visitante: 5, jornada: 1, fecha: '2026-01-01' }
    });
    await promesa;
    expect(res._status).toBe(400);
  });

  it('crear rechaza plantilla inexistente', async () => {
    Plantilla.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { id_plantilla: 1, id_equipo_local: 2, id_equipo_visitante: 3, jornada: 1, fecha: '2026-01-01' }
    });
    await promesa;
    expect(res._status).toBe(400);
  });

  it('crear rechaza jornada no positiva', async () => {
    Plantilla.findOne.mockResolvedValue({ id: 1, id_categoria: 7 });
    Equipo.findOne.mockResolvedValue({ id: 2 });
    const { promesa, res } = llamar(ctrl.crear, {
      body: { id_plantilla: 1, id_equipo_local: 2, id_equipo_visitante: 3, jornada: 0, fecha: '2026-01-01' }
    });
    await promesa;
    expect(res._status).toBe(400);
  });

  it('crea el partido con la jornada asignada', async () => {
    Plantilla.findOne.mockResolvedValue({ id: 1, id_categoria: 7 });
    Equipo.findOne.mockResolvedValue({ id: 2 });
    Partido.findOne
      .mockResolvedValueOnce(null) // duplicado: ninguno
      .mockResolvedValueOnce({ id: 500, jornada: 1 }); // respuesta tras crear
    Partido.create.mockResolvedValue({ id: 500, id_equipo_local: 2, id_equipo_visitante: 3 });

    const { promesa, res } = llamar(ctrl.crear, {
      body: { id_plantilla: 1, id_equipo_local: 2, id_equipo_visitante: 3, jornada: 1, fecha: '2026-01-01' }
    });
    await promesa;

    expect(Partido.create).toHaveBeenCalledWith(expect.objectContaining({
      id_plantilla: 1, jornada: 1, id_equipo_local: 2, id_equipo_visitante: 3, fecha: '2026-01-01T00:00:00'
    }));
    expect(res._status).toBe(201);
  });

  it('crear guarda los jugadores convocados de local y visitante', async () => {
    Plantilla.findOne.mockResolvedValue({ id: 1, id_categoria: 7 });
    Equipo.findOne.mockResolvedValue({ id: 2 });
    Partido.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 500, jornada: 1 });
    Partido.create.mockResolvedValue({ id: 500, id_equipo_local: 2, id_equipo_visitante: 3 });

    const { promesa, res } = llamar(ctrl.crear, {
      body: {
        id_plantilla: 1, id_equipo_local: 2, id_equipo_visitante: 3, jornada: 1, fecha: '2026-01-01',
        jugadores_local: [{ id_jugador: 5, tarjeta_amarilla: 1, tarjeta_roja: 0, goles: 2 }],
        jugadores_visitante: [{ id_jugador: 6, tarjeta_amarilla: 0, tarjeta_roja: 1, goles: 0 }]
      }
    });
    await promesa;

    expect(PartidoJugador.destroy).toHaveBeenCalledWith({ where: { id_partido: 500 } });
    expect(PartidoJugador.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id_partido: 500, id_jugador: 5, es_local: true, tarjeta_amarilla: 1, goles: 2 }),
        expect.objectContaining({ id_partido: 500, id_jugador: 6, es_local: false, tarjeta_roja: 1 })
      ]),
      { ignoreDuplicates: true }
    );
    expect(res._status).toBe(201);
  });

  it('crear genera sanciones solo para jugadores del PALMA con tarjetas', async () => {
    Plantilla.findOne.mockResolvedValue({ id: 1, id_categoria: 7 });
    Equipo.findOne.mockResolvedValue({ id: 2 });
    Partido.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 500, jornada: 1 });
    Partido.create.mockResolvedValue({ id: 500, id_equipo_local: 73, id_equipo_visitante: 3 });
    Sancion.findOne.mockResolvedValue(null);

    const { promesa, res } = llamar(ctrl.crear, {
      body: {
        id_plantilla: 1, id_equipo_local: 73, id_equipo_visitante: 3, jornada: 1, fecha: '2026-01-01',
        jugadores_local: [{ id_jugador: 5, tarjeta_amarilla: 2, tarjeta_roja: 0, goles: 1 }],
        jugadores_visitante: [{ id_jugador: 6, tarjeta_amarilla: 1, tarjeta_roja: 0, goles: 0 }]
      }
    });
    await promesa;

    expect(Sancion.create).toHaveBeenCalledWith({ id_partido: 500, id_jugador: 5, amarilla: 2, roja: 0 });
    expect(Sancion.create).not.toHaveBeenCalledWith(expect.objectContaining({ id_jugador: 6 }));
    expect(res._status).toBe(201);
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Partido.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '99' }, body: {} });
    await promesa;
    expect(res._status).toBe(404);
  });

  it('actualizar guarda cambios simples', async () => {
    const item = { id: 1, save: vi.fn().mockResolvedValue() };
    Partido.findOne
      .mockResolvedValueOnce(item)
      .mockResolvedValueOnce({ id: 1, jornada: 5 });
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { jornada: 5 }
    });
    await promesa;
    expect(item.jornada).toBe(5);
    expect(item.save).toHaveBeenCalled();
    expect(res._status).toBe(200);
  });

  it('actualizar combina fecha y hora nuevas en un único DATETIME', async () => {
    const item = { id: 1, id_plantilla: 5, fecha: '2026-01-01T10:00:00', save: vi.fn().mockResolvedValue() };
    Partido.findOne
      .mockResolvedValueOnce(item)
      .mockResolvedValueOnce({ id: 1 });

    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' },
      body: { fecha: '2026-02-15', hora: '18:30' }
    });
    await promesa;

    expect(item.fecha).toBe('2026-02-15T18:30');
    expect(item.save).toHaveBeenCalled();
    expect(res._status).toBe(200);
  });

  it('actualizar combina la nueva hora con la fecha existente si no cambia la fecha', async () => {
    const item = { id: 1, id_plantilla: 5, fecha: '2026-01-01T10:00:00', save: vi.fn().mockResolvedValue() };
    Partido.findOne
      .mockResolvedValueOnce(item)
      .mockResolvedValueOnce({ id: 1 });

    const { promesa } = llamar(ctrl.actualizar, {
      params: { id: '1' },
      body: { hora: '21:00' }
    });
    await promesa;

    expect(item.fecha).toBe('2026-01-01T21:00');
  });

  it('eliminar borra el partido con jornada asignada', async () => {
    Partido.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });
    await promesa;
    expect(Partido.destroy).toHaveBeenCalledWith({ where: { id: '1', jornada: { [Op.not]: null } } });
    expect(res._status).toBe(204);
  });

  it('eliminar devuelve 404 si no existe', async () => {
    Partido.destroy.mockResolvedValue(0);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '99' } });
    await promesa;
    expect(res._status).toBe(404);
  });
});
