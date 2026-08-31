import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Jugador } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/jugador.controller.js';

describe('Sección Jugadores · jugador.controller', () => {
  beforeEach(() => {
    Jugador.findAll.mockReset();
    Jugador.findOne.mockReset();
    Jugador.create.mockReset();
    Jugador.destroy.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve los jugadores serializados', async () => {
    const jugador = { id: 1, nombre: 'Luis' };
    Jugador.findAll.mockResolvedValue([jugador]);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(res._json).toEqual([{ id: 1, nombre: 'Luis' }]);
  });

  it('obtener devuelve 404 si no existe', async () => {
    Jugador.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ message: 'Jugador no encontrado.' });
  });

  it('obtener devuelve el jugador serializado', async () => {
    const jugador = { id: 3, nombre: 'Ana' };
    Jugador.findOne.mockResolvedValue(jugador);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '3' } });

    await promesa;

    expect(res._json).toEqual({ id: 3, nombre: 'Ana' });
  });

  it('obtener incluye plantillas con partidos del jugador', async () => {
    const jugador = {
      id: 3, nombre: 'Ana',
      plantillas: [{
        id: 10, categoria: { nombre: 'Cadete A' }, temporada: { nombre: '2024/25' }, division: { nombre: 'División 1' },
        PlantillaJugador: { dorsal: 10, talla: 'M' },
        partidos: [{ id: 100, fecha: '2026-01-15', equipoLocal: { nombre: 'Equipo A' }, equipoVisitante: { nombre: 'Equipo B' } }]
      }]
    };
    Jugador.findOne.mockResolvedValue(jugador);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '3' } });

    await promesa;

    const llamada = Jugador.findOne.mock.calls[0][0];
    const alias = llamada.include.map((i) => i.as);
    expect(alias).toEqual(expect.arrayContaining(['plantillas']));
    expect(res._json.plantillas).toHaveLength(1);
    expect(res._json.plantillas[0].partidos).toHaveLength(1);
  });

  it('crear valida solo nombre y apellidos obligatorios', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'Luis' } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Nombre y apellidos son obligatorios.');
    expect(Jugador.create).not.toHaveBeenCalled();
  });

  it('crear permite DNI vacío', async () => {
    const creado = { id: 5, nombre: 'Luis', apellidos: 'Ruiz', dni: null };
    Jugador.findOne.mockResolvedValue(null);
    Jugador.create.mockResolvedValue(creado);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { nombre: 'Luis', apellidos: 'Ruiz' }
    });

    await promesa;

    expect(Jugador.create).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: 'Luis', apellidos: 'Ruiz', dni: null })
    );
    expect(res._status).toBe(201);
  });

  it('crear rechaza un DNI no válido si se proporciona', async () => {
    const { promesa, res } = llamar(ctrl.crear, {
      body: { nombre: 'Luis', apellidos: 'Ruiz', dni: '12345678A' }
    });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El DNI introducido no es válido.');
    expect(Jugador.create).not.toHaveBeenCalled();
  });

  it('actualizar rechaza un DNI no válido', async () => {
    const jugador = { id: 1, save: vi.fn() };
    Jugador.findOne.mockResolvedValueOnce(jugador);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { dni: '12345678A' }
    });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El DNI introducido no es válido.');
  });

  it('crear crea el jugador y devuelve 201', async () => {
    const creado = { id: 5, nombre: 'Luis', apellidos: 'Ruiz', dni: '12345678Z' };
    Jugador.findOne.mockResolvedValue(null);
    Jugador.create.mockResolvedValue(creado);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { nombre: 'Luis', apellidos: 'Ruiz', dni: '12345678Z' }
    });

    await promesa;

    expect(Jugador.create).toHaveBeenCalledWith({
      nombre: 'Luis', apellidos: 'Ruiz', dni: '12345678Z', fecha_nacimiento: null, foto: null, telefono: null
    });
    expect(res._status).toBe(201);
    expect(res._json).toEqual({ id: 5, nombre: 'Luis', apellidos: 'Ruiz', dni: '12345678Z' });
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Jugador.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'X' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar guarda los cambios', async () => {
    const jugador = { id: 1, nombre: 'Viejo', save: vi.fn().mockResolvedValue() };
    Jugador.findOne.mockResolvedValue(jugador);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { nombre: 'Nuevo' }
    });

    await promesa;

    expect(jugador.nombre).toBe('Nuevo');
    expect(jugador.save).toHaveBeenCalled();
    expect(res._json).toEqual(jugador);
  });

  it('eliminar elimina y responde 204', async () => {
    Jugador.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });

    await promesa;

    expect(Jugador.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(res._status).toBe(204);
  });

  it('eliminar devuelve 404 si no encuentra nada', async () => {
    Jugador.destroy.mockResolvedValue(0);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
  });
});
