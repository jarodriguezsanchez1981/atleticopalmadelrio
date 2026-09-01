import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Equipo } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/equipo.controller.js';

describe('Sección Equipos · equipo.controller', () => {
  beforeEach(() => {
    Equipo.findAll.mockReset();
    Equipo.findOne.mockReset();
    Equipo.create.mockReset();
    Equipo.destroy.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve los equipos ordenados por nombre', async () => {
    const equipos = [{ id: 1, nombre: 'Senior' }];
    Equipo.findAll.mockResolvedValue(equipos);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(Equipo.findAll).toHaveBeenCalledWith({ order: [['nombre', 'ASC']] });
    expect(res._json).toEqual(equipos);
  });

  it('obtener devuelve 404 si no existe', async () => {
    Equipo.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ message: 'Equipo no encontrado.' });
  });

  it('obtener devuelve el equipo por id', async () => {
    const equipo = { id: 3, nombre: 'Juvenil' };
    Equipo.findOne.mockResolvedValue(equipo);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '3' } });

    await promesa;

    expect(Equipo.findOne).toHaveBeenCalledWith({ where: { id: '3' } });
    expect(res._json).toEqual(equipo);
  });

  it('crear valida nombre obligatorio', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: {} });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El nombre es obligatorio.');
    expect(Equipo.create).not.toHaveBeenCalled();
  });

  it('crear crea el equipo y devuelve 201', async () => {
    const creado = { id: 5, nombre: 'Senior' };
    Equipo.create.mockResolvedValue(creado);
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'Senior' } });

    await promesa;

    expect(Equipo.create).toHaveBeenCalledWith({
      nombre: 'Senior', escudo: null, direccion: null, codigopostal: null, localidad: null, provincia: null,
      camiseta: null, calzonas: null, medias: null
    });
    expect(res._status).toBe(201);
    expect(res._json).toEqual(creado);
  });

  it('crear guarda escudo, dirección, código postal, localidad y provincia si se envían', async () => {
    const creado = {
      id: 9, nombre: 'Senior',
      escudo: 'data:image/png;base64,xxx', direccion: 'Calle 1', codigopostal: '14001', localidad: 'Córdoba', provincia: 'Córdoba',
      camiseta: 'Blanca', calzonas: 'Negras', medias: 'Blancas'
    };
    Equipo.create.mockResolvedValue(creado);
    const { promesa, res } = llamar(ctrl.crear, {
      body: {
        nombre: 'Senior', escudo: 'data:image/png;base64,xxx', direccion: 'Calle 1',
        codigopostal: '14001', localidad: 'Córdoba', provincia: 'Córdoba',
        camiseta: 'Blanca', calzonas: 'Negras', medias: 'Blancas'
      }
    });

    await promesa;

    expect(Equipo.create).toHaveBeenCalledWith({
      nombre: 'Senior', escudo: 'data:image/png;base64,xxx', direccion: 'Calle 1',
      codigopostal: '14001', localidad: 'Córdoba', provincia: 'Córdoba',
      camiseta: 'Blanca', calzonas: 'Negras', medias: 'Blancas'
    });
    expect(res._status).toBe(201);
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Equipo.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'X' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar guarda los cambios', async () => {
    const equipo = { id: 1, nombre: 'Viejo', save: vi.fn().mockResolvedValue() };
    Equipo.findOne.mockResolvedValue(equipo);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'Nuevo' } });

    await promesa;

    expect(equipo.nombre).toBe('Nuevo');
    expect(equipo.save).toHaveBeenCalled();
    expect(res._json).toEqual(equipo);
  });

  it('actualizar guarda escudo y dirección y limpia vacíos', async () => {
    const equipo = { id: 1, nombre: 'Senior', save: vi.fn().mockResolvedValue() };
    Equipo.findOne.mockResolvedValue(equipo);
    const { promesa } = llamar(ctrl.actualizar, {
      params: { id: '1' },
      body: { escudo: 'data:image/png;base64,abc', direccion: 'Calle 2', escudoLimpiado: true }
    });

    await promesa;

    expect(equipo.escudo).toBe('data:image/png;base64,abc');
    expect(equipo.direccion).toBe('Calle 2');
    expect(equipo.save).toHaveBeenCalled();
  });

  it('actualizar permite quitar escudo', async () => {
    const equipo = { id: 1, nombre: 'Senior', escudo: 'viejo', save: vi.fn().mockResolvedValue() };
    Equipo.findOne.mockResolvedValue(equipo);
    const { promesa } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { escudo: null } });

    await promesa;

    expect(equipo.escudo).toBeNull();
  });

  it('eliminar elimina y responde 204', async () => {
    Equipo.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });

    await promesa;

    expect(Equipo.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(res._status).toBe(204);
  });

  it('eliminar devuelve 404 si no encuentra nada', async () => {
    Equipo.destroy.mockResolvedValue(0);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
  });
});
