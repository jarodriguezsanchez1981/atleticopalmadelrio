import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Coordinador, TipoFutbol, Categoria, Plantilla } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/coordinador.controller.js';

describe('Sección Coordinadores · coordinador.controller', () => {
  beforeEach(() => {
    Coordinador.findAll.mockReset();
    Coordinador.findOne.mockReset();
    Coordinador.create.mockReset();
    Coordinador.destroy.mockReset();
    TipoFutbol.findOne.mockReset();
    Categoria.findAll.mockReset();
    Plantilla.update.mockReset();
    Categoria.findAll.mockResolvedValue([]);
    Plantilla.update.mockResolvedValue([0]);
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve los coordinadores ordenados por apellidos ASC, con el tipo de fútbol', async () => {
    const coordinadores = [{ id: 1, nombre: 'Ana', apellidos: 'García' }];
    Coordinador.findAll.mockResolvedValue(coordinadores);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(Coordinador.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ include: expect.any(Array), order: [['apellidos', 'ASC']] })
    );
    expect(res._json).toEqual(coordinadores);
  });

  it('obtener devuelve el coordinador por id', async () => {
    const coordinador = { id: 3, nombre: 'Luis', apellidos: 'Pérez' };
    Coordinador.findOne.mockResolvedValue(coordinador);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '3' } });

    await promesa;

    expect(Coordinador.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: '3' }, include: expect.any(Array) })
    );
    expect(res._json).toEqual(coordinador);
  });

  it('obtener devuelve 404 si no existe', async () => {
    Coordinador.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ message: 'Coordinador no encontrado.' });
  });

  it('crear valida nombre y apellidos obligatorios', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'Ana' } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Nombre y apellidos son obligatorios.');
    expect(Coordinador.create).not.toHaveBeenCalled();
  });

  it('crear rechaza un tipo de fútbol que no existe', async () => {
    TipoFutbol.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.crear, {
      body: { nombre: 'Ana', apellidos: 'García', id_tipofutbol: 99 }
    });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El tipo de fútbol indicado no existe.');
    expect(Coordinador.create).not.toHaveBeenCalled();
  });

  it('crear crea el coordinador con tipo de fútbol y devuelve 201', async () => {
    TipoFutbol.findOne.mockResolvedValue({ id: 2, nombre: 'Futbol 11' });
    Coordinador.create.mockResolvedValue({ id: 5 });
    const completo = { id: 5, nombre: 'Ana', apellidos: 'García', id_tipofutbol: 2, email: 'ana@club.es', telefono: '600111222' };
    Coordinador.findOne.mockResolvedValue(completo);

    const { promesa, res } = llamar(ctrl.crear, {
      body: { nombre: 'Ana', apellidos: 'García', id_tipofutbol: 2, email: 'ana@club.es', telefono: '600111222' }
    });

    await promesa;

    expect(Coordinador.create).toHaveBeenCalledWith({
      nombre: 'Ana', apellidos: 'García', id_tipofutbol: 2, email: 'ana@club.es', telefono: '600111222'
    });
    expect(res._status).toBe(201);
    expect(res._json).toEqual(completo);
  });

  it('crear permite tipo de fútbol, email y teléfono vacíos', async () => {
    Coordinador.create.mockResolvedValue({ id: 6 });
    const completo = { id: 6, nombre: 'Luis', apellidos: 'Pérez' };
    Coordinador.findOne.mockResolvedValue(completo);

    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'Luis', apellidos: 'Pérez' } });

    await promesa;

    expect(TipoFutbol.findOne).not.toHaveBeenCalled();
    expect(Coordinador.create).toHaveBeenCalledWith({
      nombre: 'Luis', apellidos: 'Pérez', id_tipofutbol: null, email: null, telefono: null
    });
    expect(res._status).toBe(201);
    expect(Plantilla.update).not.toHaveBeenCalled();
  });

  it('crear asigna el coordinador a todas las plantillas cuya categoría comparte su tipo de fútbol', async () => {
    TipoFutbol.findOne.mockResolvedValue({ id: 2, nombre: 'Futbol 11' });
    Coordinador.create.mockResolvedValue({ id: 7, id_tipofutbol: 2 });
    Categoria.findAll.mockResolvedValue([{ id: 30 }, { id: 31 }]);
    const completo = { id: 7, nombre: 'Ana', apellidos: 'García', id_tipofutbol: 2 };
    Coordinador.findOne.mockResolvedValue(completo);

    const { promesa, res } = llamar(ctrl.crear, {
      body: { nombre: 'Ana', apellidos: 'García', id_tipofutbol: 2 }
    });

    await promesa;

    expect(Categoria.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_tipofutbol: 2 } })
    );
    expect(Plantilla.update).toHaveBeenCalledWith(
      { id_coordinador: 7 },
      { where: { id_categoria: [30, 31] } }
    );
    expect(res._status).toBe(201);
  });

  it('crear no toca plantillas si el coordinador no tiene tipo de fútbol', async () => {
    Coordinador.create.mockResolvedValue({ id: 8, id_tipofutbol: null });
    Coordinador.findOne.mockResolvedValue({ id: 8, nombre: 'Sin', apellidos: 'Tipo' });

    const { promesa } = llamar(ctrl.crear, { body: { nombre: 'Sin', apellidos: 'Tipo' } });

    await promesa;

    expect(Categoria.findAll).not.toHaveBeenCalled();
    expect(Plantilla.update).not.toHaveBeenCalled();
  });

  it('crear no llama a Plantilla.update si ninguna categoría comparte el tipo de fútbol', async () => {
    TipoFutbol.findOne.mockResolvedValue({ id: 2, nombre: 'Futbol 11' });
    Coordinador.create.mockResolvedValue({ id: 9, id_tipofutbol: 2 });
    Categoria.findAll.mockResolvedValue([]);
    Coordinador.findOne.mockResolvedValue({ id: 9, nombre: 'Ana', apellidos: 'García', id_tipofutbol: 2 });

    const { promesa } = llamar(ctrl.crear, {
      body: { nombre: 'Ana', apellidos: 'García', id_tipofutbol: 2 }
    });

    await promesa;

    expect(Plantilla.update).not.toHaveBeenCalled();
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Coordinador.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'X' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar rechaza un tipo de fútbol que no existe', async () => {
    const coordinador = { id: 1, save: vi.fn() };
    Coordinador.findOne.mockResolvedValueOnce(coordinador);
    TipoFutbol.findOne.mockResolvedValue(null);

    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { id_tipofutbol: 99 }
    });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El tipo de fútbol indicado no existe.');
    expect(coordinador.save).not.toHaveBeenCalled();
  });

  it('actualizar guarda los cambios, incluido el tipo de fútbol', async () => {
    const coordinador = { id: 1, nombre: 'Viejo', email: null, id_tipofutbol: null, save: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, nombre: 'Nuevo', email: 'nuevo@club.es', id_tipofutbol: 1 };
    Coordinador.findOne
      .mockResolvedValueOnce(coordinador)
      .mockResolvedValueOnce(actualizado);
    TipoFutbol.findOne.mockResolvedValue({ id: 1, nombre: 'Futbol 7' });

    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { nombre: 'Nuevo', email: 'nuevo@club.es', id_tipofutbol: 1 }
    });

    await promesa;

    expect(coordinador.nombre).toBe('Nuevo');
    expect(coordinador.email).toBe('nuevo@club.es');
    expect(coordinador.id_tipofutbol).toBe(1);
    expect(coordinador.save).toHaveBeenCalled();
    expect(res._json).toEqual(actualizado);
  });

  it('eliminar elimina y responde 204', async () => {
    Coordinador.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });

    await promesa;

    expect(Coordinador.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(res._status).toBe(204);
  });

  it('eliminar devuelve 404 si no encuentra nada', async () => {
    Coordinador.destroy.mockResolvedValue(0);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
  });
});
