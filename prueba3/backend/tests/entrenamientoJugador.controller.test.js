import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EntrenamientoJugador } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/entrenamientoJugador.controller.js';

describe('Entrenamientos Semanales · entrenamientoJugador.controller', () => {
  beforeEach(() => {
    EntrenamientoJugador.findAll.mockReset();
    EntrenamientoJugador.findByPk.mockReset();
EntrenamientoJugador.create.mockReset();
    EntrenamientoJugador.destroy.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve los registros ordenados', async () => {
    const lista = [{ id: 1, id_jugador: 2, asistencia: true }];
    EntrenamientoJugador.findAll.mockResolvedValue(lista);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(EntrenamientoJugador.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ order: [['id', 'ASC']], include: expect.any(Array) })
    );
    expect(res._json).toEqual(lista);
  });

  it('listar filtra por entrenamiento y jugador', async () => {
    EntrenamientoJugador.findAll.mockResolvedValue([]);
    const { promesa } = llamar(ctrl.listar, { query: { id_entrenamiento: '2', id_jugador: '3' } });

    await promesa;

    expect(EntrenamientoJugador.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_entrenamiento: '2', id_jugador: '3' } })
    );
  });

  it('obtener devuelve 404 si no existe', async () => {
    EntrenamientoJugador.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('crear valida entrenamiento y jugador obligatorios', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { id_entrenamiento: 1 } });

    await promesa;

    expect(res._status).toBe(400);
    expect(EntrenamientoJugador.create).not.toHaveBeenCalled();
  });

  it('crear crea el registro 201 con asistencia por defecto true', async () => {
    const creado = { id: 5, id_entrenamiento: 2, id_jugador: 3 };
    const completo = { id: 5, id_entrenamiento: 2, id_jugador: 3, asistencia: true, entrenamiento: null, jugador: { id: 3 } };
    EntrenamientoJugador.create.mockResolvedValue(creado);
    EntrenamientoJugador.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { id_entrenamiento: 2, id_jugador: 3 }
    });

    await promesa;

    expect(EntrenamientoJugador.create).toHaveBeenCalledWith({
      id_entrenamiento: 2, id_jugador: 3, asistencia: true, incidencias: null
    });
    expect(res._status).toBe(201);
  });

  it('crear normaliza ausente false', async () => {
    EntrenamientoJugador.create.mockResolvedValue({ id: 1 });
    EntrenamientoJugador.findByPk.mockResolvedValue({ id: 1 });
    const { promesa } = llamar(ctrl.crear, {
      body: { id_entrenamiento: 2, id_jugador: 3, asistencia: false }
    });

    await promesa;

    expect(EntrenamientoJugador.create).toHaveBeenCalledWith(
      expect.objectContaining({ asistencia: false })
    );
  });

  it('actualizar devuelve 404 si no existe', async () => {
    EntrenamientoJugador.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { asistencia: false } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar guarda los cambios', async () => {
    const registro = { id: 1, asistencia: true, save: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, asistencia: false, entrenamiento: null, jugador: null };
    EntrenamientoJugador.findByPk.mockResolvedValueOnce(registro).mockResolvedValueOnce(actualizado);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { asistencia: false } });

    await promesa;

    expect(registro.asistencia).toBe(false);
    expect(registro.save).toHaveBeenCalled();
    expect(res._json).toEqual(actualizado);
  });

  it('eliminar elimina y responde 204', async () => {
    EntrenamientoJugador.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });

    await promesa;

    expect(EntrenamientoJugador.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(res._status).toBe(204);
  });

  it('eliminar devuelve 404 si no encuentra nada', async () => {
    EntrenamientoJugador.destroy.mockResolvedValue(0);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
  });
});