import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Jugador, Categoria, Temporada } from './helpers/models.js';
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

  it('listar devuelve los jugadores serializados con ids_categorias', async () => {
    const jugador = { id: 1, nombre: 'Luis', categorias: [{ id: 2 }] };
    Jugador.findAll.mockResolvedValue([jugador]);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(res._json).toEqual([{ id: 1, nombre: 'Luis', categorias: [{ id: 2 }], ids_categorias: [2] }]);
  });

  it('listar filtra por temporada', async () => {
    Jugador.findAll.mockResolvedValue([]);
    const { promesa, res } = llamar(ctrl.listar, { query: { id_temporada: '3' } });

    await promesa;

    expect(Jugador.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_temporada: '3' }, include: expect.any(Array) })
    );
  });

  it('obtener devuelve 404 si no existe', async () => {
    Jugador.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ message: 'Jugador no encontrado.' });
  });

  it('obtener devuelve el jugador serializado', async () => {
    const jugador = { id: 3, nombre: 'Ana', categorias: [{ id: 4 }, { id: 5 }] };
    Jugador.findOne.mockResolvedValue(jugador);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '3' } });

    await promesa;

    expect(res._json.ids_categorias).toEqual([4, 5]);
  });

  it('obtener incluye convocatorias y asistencias del jugador', async () => {
    const jugador = {
      id: 3, nombre: 'Ana', categorias: [],
      convocatorias: [{ id: 1, partido: { fecha: '2026-01-01' } }],
      asistencias: [{ id: 2, entrenamiento: { fecha: '2026-02-01' }, asistencia: true }]
    };
    Jugador.findOne.mockResolvedValue(jugador);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '3' } });

    await promesa;

    const llamada = Jugador.findOne.mock.calls[0][0];
    const alias = llamada.include.map((i) => i.as);
    expect(alias).toEqual(expect.arrayContaining(['convocatorias', 'asistencias']));
    expect(res._json.convocatorias).toHaveLength(1);
    expect(res._json.asistencias).toHaveLength(1);
  });

  it('crear valida campos obligatorios', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'Luis' } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Nombre, apellidos, DNI y temporada son obligatorios.');
    expect(Jugador.create).not.toHaveBeenCalled();
  });

  it('crear rechaza un DNI no válido', async () => {
    const { promesa, res } = llamar(ctrl.crear, {
      body: { nombre: 'Luis', apellidos: 'Ruiz', dni: '12345678A', id_temporada: 1 }
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

  it('crear crea el jugador, asigna categorías y devuelve 201', async () => {
    const creado = { id: 5, setCategorias: vi.fn().mockResolvedValue() };
    const completo = { id: 5, nombre: 'Luis', categorias: [{ id: 2 }] };
    Jugador.create.mockResolvedValue(creado);
    Jugador.findOne.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { nombre: 'Luis', apellidos: 'Ruiz', dni: '12345678Z', id_temporada: 1, ids_categorias: ['2', '3'] }
    });

    await promesa;

    expect(Jugador.create).toHaveBeenCalledWith({
      nombre: 'Luis', apellidos: 'Ruiz', dni: '12345678Z', foto: null, dorsal: null, id_temporada: 1
    });
    expect(creado.setCategorias).toHaveBeenCalledWith([2, 3]);
    expect(res._status).toBe(201);
    expect(res._json.ids_categorias).toEqual([2]);
  });

  it('crear guarda el dorsal numérico', async () => {
    const creado = { id: 6, setCategorias: vi.fn().mockResolvedValue() };
    const completo = { id: 6, nombre: 'Ana', categorias: [] };
    Jugador.create.mockResolvedValue(creado);
    Jugador.findOne.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { nombre: 'Ana', apellidos: 'Mora', dni: '12345678Z', id_temporada: 1, dorsal: '7' }
    });

    await promesa;

    expect(Jugador.create).toHaveBeenCalledWith(expect.objectContaining({ dorsal: 7 }));
    expect(res._status).toBe(201);
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Jugador.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'X' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar guarda los cambios y asigna categorías', async () => {
    const jugador = { id: 1, nombre: 'Viejo', save: vi.fn().mockResolvedValue(), setCategorias: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, nombre: 'Nuevo', categorias: [] };
    Jugador.findOne.mockResolvedValueOnce(jugador).mockResolvedValueOnce(actualizado);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { nombre: 'Nuevo', categorias: [{ id: 2 }], dorsal: '10' }
    });

    await promesa;

    expect(jugador.nombre).toBe('Nuevo');
    expect(jugador.dorsal).toBe(10);
    expect(jugador.save).toHaveBeenCalled();
    expect(jugador.setCategorias).toHaveBeenCalledWith([2]);
    expect(res._json).toEqual({ id: 1, nombre: 'Nuevo', categorias: [], ids_categorias: [] });
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
