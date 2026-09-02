import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Jornada, JornadaJugador, Plantilla, Equipo, Partido, Sancion } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/jornada.controller.js';

describe('Sección Jornadas · jornada.controller', () => {
  beforeEach(() => {
    Jornada.findAll.mockReset();
    Jornada.findOne.mockReset();
    Jornada.create.mockReset();
    Jornada.destroy.mockReset();
    JornadaJugador.destroy.mockReset();
    JornadaJugador.bulkCreate.mockReset();
    Plantilla.findOne.mockReset();
    Equipo.findOne.mockReset();
    Partido.create.mockReset();
    Partido.destroy.mockReset();
    Partido.findOne.mockReset();
    Sancion.findOne.mockReset();
    Sancion.create.mockReset();
    Sancion.destroy.mockReset();
    Sancion.save.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve las jornadas filtradas', async () => {
    Jornada.findAll.mockResolvedValue([{ id: 1, jornada: 1 }]);
    const { promesa, res } = llamar(ctrl.listar, { query: { id_plantilla: '2' } });
    await promesa;
    expect(res._json).toHaveLength(1);
    const where = Jornada.findAll.mock.calls[0][0].where;
    expect(where).toMatchObject({ id_plantilla: '2' });
  });

  it('obtener devuelve 404 si no existe', async () => {
    Jornada.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });
    await promesa;
    expect(res._status).toBe(404);
  });

  it('crear valida campos obligatorios', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { id_plantilla: 1 } });
    await promesa;
    expect(res._status).toBe(400);
    expect(Jornada.create).not.toHaveBeenCalled();
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

  it('crea jornada y su partido', async () => {
    Plantilla.findOne.mockResolvedValue({ id: 1, id_categoria: 7 });
    Equipo.findOne.mockResolvedValue({ id: 2 });
    Jornada.findOne
      .mockResolvedValueOnce(null)   // duplicado: ninguno
      .mockResolvedValueOnce({ id: 10, jornada: 1 }); // respuesta
    Jornada.create.mockResolvedValue({ id: 10 });

    const { promesa, res } = llamar(ctrl.crear, {
      body: { id_plantilla: 1, id_equipo_local: 2, id_equipo_visitante: 3, jornada: 1, fecha: '2026-01-01' }
    });
    await promesa;

    expect(Jornada.create).toHaveBeenCalled();
    expect(Partido.create).toHaveBeenCalledTimes(1);
    expect(res._status).toBe(201);
  });

  it('crear guarda los jugadores convocados de local y visitante', async () => {
    Plantilla.findOne.mockResolvedValue({ id: 1, id_categoria: 7 });
    Equipo.findOne.mockResolvedValue({ id: 2 });
    Jornada.findOne
      .mockResolvedValueOnce(null)   // duplicado: ninguno
      .mockResolvedValueOnce({ id: 10, jornada: 1 }); // respuesta
    Jornada.create.mockResolvedValue({ id: 10 });

    const { promesa, res } = llamar(ctrl.crear, {
      body: {
        id_plantilla: 1, id_equipo_local: 2, id_equipo_visitante: 3, jornada: 1, fecha: '2026-01-01',
        jugadores_local: [{ id_jugador: 5, tarjeta_amarilla: 1, tarjeta_roja: 0, goles: 2 }],
        jugadores_visitante: [{ id_jugador: 6, tarjeta_amarilla: 0, tarjeta_roja: 1, goles: 0 }]
      }
    });
    await promesa;

    expect(JornadaJugador.destroy).toHaveBeenCalledWith({ where: { id_jornada: 10 } });
    expect(JornadaJugador.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id_jornada: 10, id_jugador: 5, es_local: true, tarjeta_amarilla: 1, goles: 2 }),
        expect.objectContaining({ id_jornada: 10, id_jugador: 6, es_local: false, tarjeta_roja: 1 })
      ]),
      { ignoreDuplicates: true }
    );
    expect(res._status).toBe(201);
  });

  it('crear genera sanciones solo para jugadores del PALMA con tarjetas', async () => {
    Plantilla.findOne.mockResolvedValue({ id: 1, id_categoria: 7 });
    Equipo.findOne.mockResolvedValue({ id: 2 });
    Jornada.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 10, jornada: 1 });
    Jornada.create.mockResolvedValue({ id: 10, id_plantilla: 1, fecha: '2026-01-01', id_equipo_local: 73, id_equipo_visitante: 3 });
    Partido.findOne.mockResolvedValue({ id: 500 });
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
    Jornada.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '99' }, body: {} });
    await promesa;
    expect(res._status).toBe(404);
  });

  it('actualizar guarda cambios', async () => {
    const item = { id: 1, save: vi.fn().mockResolvedValue() };
    Jornada.findOne.mockResolvedValue(item);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { jornada: 5 }
    });
    await promesa;
    expect(item.jornada).toBe(5);
    expect(item.save).toHaveBeenCalled();
  });

  it('eliminar borra partidos asociados y la jornada', async () => {
    const jornada = { id: 1, id_plantilla: 5, fecha: '2026-01-01', destroy: vi.fn().mockResolvedValue() };
    Jornada.findOne.mockResolvedValue(jornada);
    Partido.destroy.mockResolvedValue(2);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });
    await promesa;
    expect(Partido.destroy).toHaveBeenCalledWith({ where: { id_plantilla: 5, fecha: '2026-01-01' } });
    expect(jornada.destroy).toHaveBeenCalled();
    expect(res._status).toBe(204);
  });

  it('eliminar devuelve 404 si no existe', async () => {
    Jornada.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '99' } });
    await promesa;
    expect(res._status).toBe(404);
  });
});
