import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EquipoJugador, Equipo, Categoria } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/equipoJugador.controller.js';

describe('Equipos Jugadores · equipoJugador.controller', () => {
  beforeEach(() => {
    EquipoJugador.findAll.mockReset();
    EquipoJugador.findOne.mockReset();
    EquipoJugador.create.mockReset();
    EquipoJugador.destroy.mockReset();
    Equipo.findOne.mockReset();
    Categoria.findOne.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve los jugadores de equipo sin filtros', async () => {
    const items = [{ id: 1, nombre: 'Ana', apellidos: 'López' }];
    EquipoJugador.findAll.mockResolvedValue(items);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(EquipoJugador.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ order: [['apellidos', 'ASC'], ['nombre', 'ASC']] })
    );
    expect(res._json).toEqual(items);
  });

  it('listar filtra por equipo y categoría', async () => {
    EquipoJugador.findAll.mockResolvedValue([]);
    const { promesa } = llamar(ctrl.listar, { query: { id_equipo: '5', id_categoria: '20' } });

    await promesa;

    expect(EquipoJugador.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_equipo: '5', id_categoria: '20' } })
    );
  });

  it('obtener devuelve 404 si no existe', async () => {
    EquipoJugador.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ message: 'Jugador de equipo no encontrado.' });
  });

  it('crear valida campos obligatorios', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'Ana' } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Equipo, categoría, nombre y apellidos son obligatorios.');
    expect(EquipoJugador.create).not.toHaveBeenCalled();
  });

  it('crear rechaza un equipo inexistente', async () => {
    Equipo.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { id_equipo: 5, id_categoria: 20, nombre: 'Ana', apellidos: 'López' }
    });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El equipo indicado no existe.');
    expect(EquipoJugador.create).not.toHaveBeenCalled();
  });

  it('crear crea el registro y devuelve 201', async () => {
    Equipo.findOne.mockResolvedValue({ id: 5 });
    Categoria.findOne.mockResolvedValue({ id: 20 });
    EquipoJugador.create.mockResolvedValue({ id: 1 });
    EquipoJugador.findOne.mockResolvedValue({ id: 1, id_equipo: 5, id_categoria: 20, nombre: 'Ana', apellidos: 'López' });
    const { promesa, res } = llamar(ctrl.crear, {
      body: { id_equipo: 5, id_categoria: 20, nombre: 'Ana', apellidos: 'López' }
    });

    await promesa;

    expect(EquipoJugador.create).toHaveBeenCalledWith({ id_equipo: 5, id_categoria: 20, nombre: 'Ana', apellidos: 'López' });
    expect(res._status).toBe(201);
  });

  it('eliminar elimina y responde 204', async () => {
    EquipoJugador.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });

    await promesa;

    expect(EquipoJugador.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(res._status).toBe(204);
  });

  it('eliminar devuelve 404 si no encuentra nada', async () => {
    EquipoJugador.destroy.mockResolvedValue(0);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
  });
});
