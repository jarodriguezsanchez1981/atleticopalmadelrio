import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PartidoJugador } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/partidoJugador.controller.js';

describe('Partidos Jugadores · partidoJugador.controller', () => {
  beforeEach(() => {
    PartidoJugador.findAll.mockReset();
    PartidoJugador.findByPk.mockReset();
    PartidoJugador.create.mockReset();
    PartidoJugador.destroy.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve los registros ordenados', async () => {
    const lista = [{ id: 1, id_jugador: 2, goles: 1 }];
    PartidoJugador.findAll.mockResolvedValue(lista);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(PartidoJugador.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ order: [['id', 'ASC']], include: expect.any(Array) })
    );
    expect(res._json).toEqual(lista);
  });

  it('listar filtra por partido y jugador', async () => {
    PartidoJugador.findAll.mockResolvedValue([]);
    const { promesa } = llamar(ctrl.listar, { query: { id_partido: '1', id_jugador: '2' } });

    await promesa;

    expect(PartidoJugador.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_partido: '1', id_jugador: '2' } })
    );
  });

  it('listar filtra por categoría del partido', async () => {
    PartidoJugador.findAll.mockResolvedValue([]);
    const { promesa } = llamar(ctrl.listar, { query: { id_categoria: '3' } });

    await promesa;

    const args = PartidoJugador.findAll.mock.calls[0][0];
    expect(args.include[0]).toMatchObject({ where: { id_categoria: '3' } });
  });

  it('obtener devuelve 404 si no existe', async () => {
    PartidoJugador.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('crear valida partido y jugador obligatorios', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { id_partido: 1 } });

    await promesa;

    expect(res._status).toBe(400);
    expect(PartidoJugador.create).not.toHaveBeenCalled();
  });

  it('crear crea el registro con estadísticas y devuelve 201', async () => {
    const creado = { id: 5, id_partido: 1, id_jugador: 2 };
    const completo = { id: 5, id_partido: 1, id_jugador: 2, partido: null, jugador: { id: 2 } };
    PartidoJugador.create.mockResolvedValue(creado);
    PartidoJugador.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      body: {
        id_partido: 1, id_jugador: 2,
        minutos: 90, goles: 2, tarjeta_amarilla: 1, tarjeta_roja: 0, incidencias: 'Goleador'
      }
    });

    await promesa;

    expect(PartidoJugador.create).toHaveBeenCalledWith({
      id_partido: 1, id_jugador: 2, minutos: 90, goles: 2,
      tarjeta_amarilla: 1, tarjeta_roja: 0, incidencias: 'Goleador'
    });
    expect(res._status).toBe(201);
  });

  it('crear normaliza valores numéricos a 0 si son inválidos', async () => {
    PartidoJugador.create.mockResolvedValue({ id: 1 });
    PartidoJugador.findByPk.mockResolvedValue({ id: 1 });
    const { promesa } = llamar(ctrl.crear, {
      body: { id_partido: 1, id_jugador: 2, minutos: 'abc', goles: -5 }
    });

    await promesa;

    expect(PartidoJugador.create).toHaveBeenCalledWith(
      expect.objectContaining({ minutos: 0, goles: 0 })
    );
  });

  it('actualizar devuelve 404 si no existe', async () => {
    PartidoJugador.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { goles: 3 } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar guarda los cambios', async () => {
    const registro = { id: 1, goles: 0, save: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, goles: 3, partido: null, jugador: null };
    PartidoJugador.findByPk.mockResolvedValueOnce(registro).mockResolvedValueOnce(actualizado);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { goles: 3, tarjeta_amarilla: '2' }
    });

    await promesa;

    expect(registro.goles).toBe(3);
    expect(registro.tarjeta_amarilla).toBe(2);
    expect(registro.save).toHaveBeenCalled();
    expect(res._json).toEqual(actualizado);
  });

  it('eliminar elimina y responde 204', async () => {
    PartidoJugador.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });

    await promesa;

    expect(PartidoJugador.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(res._status).toBe(204);
  });

  it('eliminar devuelve 404 si no encuentra nada', async () => {
    PartidoJugador.destroy.mockResolvedValue(0);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
  });
});