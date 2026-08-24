import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Plantilla, Categoria, Temporada, Division, Jugador, Entrenador, Delegado } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/plantilla.controller.js';

describe('Sección Plantillas · plantilla.controller', () => {
  beforeEach(() => {
    Plantilla.findAll.mockReset();
    Plantilla.findOne.mockReset();
    Plantilla.create.mockReset();
    Plantilla.destroy.mockReset();
    Categoria.findOne.mockReset();
    Temporada.findOne.mockReset();
    Division.findOne.mockReset();
    Jugador.findOne.mockReset();
    Entrenador.findOne.mockReset();
    Delegado.findOne.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res };
  }

  function mockReferenciasOk() {
    Categoria.findOne.mockResolvedValue({ id: 1, nombre: 'Senior' });
    Temporada.findOne.mockResolvedValue({ id: 1, nombre: '2025/26' });
  }

  it('listar devuelve las plantillas', async () => {
    const plantillas = [{ id: 1, id_categoria: 1 }];
    Plantilla.findAll.mockResolvedValue(plantillas);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(Plantilla.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ include: expect.any(Array) })
    );
    expect(res._json).toEqual([{ id: 1, id_categoria: 1 }]);
  });

  it('listar filtra por categoría y temporada', async () => {
    Plantilla.findAll.mockResolvedValue([]);
    const { promesa } = llamar(ctrl.listar, { query: { id_categoria: '2', id_temporada: '3' } });

    await promesa;

    expect(Plantilla.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_categoria: '2', id_temporada: '3' } })
    );
  });

  it('obtener devuelve 404 si no existe', async () => {
    Plantilla.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json.message).toBe('Plantilla no encontrada.');
  });

  it('crear exige categoría y temporada', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: {} });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Categoría y temporada son obligatorias.');
    expect(Plantilla.create).not.toHaveBeenCalled();
  });

  it('crear permite plantilla sin jugador, entrenador ni delegado', async () => {
    Categoria.findOne.mockResolvedValue({ id: 1 });
    Temporada.findOne.mockResolvedValue({ id: 1 });
    const completa = { id: 11, id_categoria: 1, id_temporada: 1 };
    Plantilla.findOne
      .mockResolvedValueOnce(null)       // única temporada: sin conflictos
      .mockResolvedValueOnce(completa);  // fila completa tras create (sin personas no hay check de duplicados)
    Plantilla.create.mockResolvedValue({ id: 11 });

    const { promesa, res } = llamar(ctrl.crear, {
      body: { id_categoria: 1, id_temporada: 1 }
    });

    await promesa;

    expect(Plantilla.create).toHaveBeenCalledWith({
      id_categoria: 1,
      id_temporada: 1,
      id_division: null,
      id_jugador: null,
      id_entrenador: null,
      id_delegado: null
    });
    expect(res._status).toBe(201);
    expect(res._json.id).toBe(11);
  });

  it('crear valida que la categoría exista', async () => {
    Categoria.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.crear, { body: { id_categoria: 99, id_temporada: 1, id_jugador: 5 } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('La categoría indicada no existe.');
  });

  it('crear valida que la temporada exista', async () => {
    Categoria.findOne.mockResolvedValue({ id: 1 });
    Temporada.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.crear, { body: { id_categoria: 1, id_temporada: 99, id_jugador: 5 } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('La temporada indicada no existe.');
  });

  it('crear rechaza una segunda temporada para la misma categoría', async () => {
    Categoria.findOne
      .mockResolvedValueOnce({ id: 1 })                // referencia categoría
      .mockResolvedValueOnce({ nombre: 'Senior' });    // nombre para el mensaje
    Temporada.findOne
      .mockResolvedValueOnce({ id: 2 })                // referencia temporada
      .mockResolvedValueOnce({ nombre: '2024/25' });   // temporada previa para el mensaje
    Jugador.findOne.mockResolvedValue({ id: 5 });
    Plantilla.findOne.mockResolvedValue({ id: 7, id_temporada: 9 }); // otra temporada encontrada
    const { promesa, res } = llamar(ctrl.crear, { body: { id_categoria: 1, id_temporada: 2, id_jugador: 5 } });

    await promesa;

    expect(res._status).toBe(409);
    expect(res._json.message).toBe('La categoría Senior ya tiene plantilla en la temporada 2024/25.');
    expect(Plantilla.create).not.toHaveBeenCalled();
  });

  it('crear registra una categoría nueva', async () => {
    Categoria.findOne.mockResolvedValue({ id: 1 });
    Temporada.findOne.mockResolvedValue({ id: 1 });
    Jugador.findOne.mockResolvedValue({ id: 5 });
    const completa = { id: 10, id_categoria: 1, id_temporada: 1, jugador: { id: 5 } };
    Plantilla.findOne
      .mockResolvedValueOnce(null)       // categoría disponible
      .mockResolvedValueOnce(completa);  // fila completa tras create
    Plantilla.create.mockResolvedValue({ id: 10 });

    const { promesa, res } = llamar(ctrl.crear, {
      body: { id_categoria: 1, id_temporada: 1, id_jugador: 5 }
    });

    await promesa;

    expect(Plantilla.create).toHaveBeenCalledWith({
      id_categoria: 1,
      id_temporada: 1,
      id_division: null,
      id_jugador: 5,
      id_entrenador: null,
      id_delegado: null
    });
    expect(res._status).toBe(201);
    expect(res._json.id).toBe(10);
  });

  it('crear rechaza una categoría ya registrada en la misma temporada', async () => {
    Categoria.findOne
      .mockResolvedValueOnce({ id: 1 })               // referencia categoría
      .mockResolvedValueOnce({ nombre: 'Senior' });   // nombre para el mensaje
    Temporada.findOne.mockResolvedValueOnce({ id: 2 }); // referencia temporada
    Jugador.findOne.mockResolvedValue({ id: 5 });
    Plantilla.findOne.mockResolvedValue({ id: 7, id_temporada: 2 }); // ya registrada en esa temporada
    const { promesa, res } = llamar(ctrl.crear, { body: { id_categoria: 1, id_temporada: 2, id_jugador: 5 } });

    await promesa;

    expect(res._status).toBe(409);
    expect(res._json.message).toBe('La categoría Senior ya está registrada en esa temporada.');
    expect(Plantilla.create).not.toHaveBeenCalled();
  });

  it('crear permite al mismo jugador en otra categoría', async () => {
    Categoria.findOne.mockResolvedValue({ id: 2 });
    Temporada.findOne.mockResolvedValue({ id: 1 });
    Jugador.findOne.mockResolvedValue({ id: 5 });
    const completa = { id: 12, id_categoria: 2, id_temporada: 1, jugador: { id: 5 } };
    Plantilla.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(completa);
    Plantilla.create.mockResolvedValue({ id: 12 });

    const { promesa, res } = llamar(ctrl.crear, {
      body: { id_categoria: 2, id_temporada: 1, id_jugador: 5 }
    });

    await promesa;

    expect(res._status).toBe(201);
    expect(res._json.id).toBe(12);
  });

  it('actualizar guarda los cambios', async () => {
    const plantilla = { id: 1, id_categoria: 1, id_temporada: 1, id_division: null, id_jugador: null, id_entrenador: null, id_delegado: null, save: vi.fn().mockResolvedValue() };
    const actualizada = { id: 1, id_entrenador: 2 };
    Plantilla.findOne
      .mockResolvedValueOnce(plantilla)    // buscar fila
      .mockResolvedValueOnce(null)         // duplicado entrenador: ninguno
      .mockResolvedValueOnce(actualizada); // fila completa tras save
    Categoria.findOne.mockResolvedValue({ id: 1 });
    Temporada.findOne.mockResolvedValue({ id: 1 });
    Entrenador.findOne.mockResolvedValue({ id: 2 });
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' },
      body: { id_entrenador: 2 }
    });

    await promesa;

    expect(plantilla.save).toHaveBeenCalled();
    expect(res._json.id).toBe(1);
  });

  it('eliminar devuelve 204 y 404 si no existe', async () => {
    Plantilla.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });

    await promesa;

    expect(res._status).toBe(204);

    Plantilla.destroy.mockResolvedValue(0);
    const llamada2 = llamar(ctrl.eliminar, { params: { id: '99' } });
    await llamada2.promesa;
    expect(llamada2.res._status).toBe(404);
  });

  it('crearParaTemporada exige temporada', async () => {
    const { promesa, res } = llamar(ctrl.crearParaTemporada, { body: {} });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('La temporada es obligatoria.');
  });

  it('crearParaTemporada valida que la temporada exista', async () => {
    Temporada.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.crearParaTemporada, { body: { id_temporada: 99 } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('La temporada indicada no existe.');
  });

  it('crearParaTemporada crea una fila por cada categoría libre', async () => {
    Temporada.findOne.mockResolvedValue({ id: 1, nombre: '2026/27' });
    Categoria.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
    Plantilla.findAll.mockResolvedValue([{ id_categoria: 3 }]); // la 3 ya está registrada
    Plantilla.bulkCreate.mockReset();
    Plantilla.bulkCreate.mockResolvedValue([]);

    const { promesa, res } = llamar(ctrl.crearParaTemporada, { body: { id_temporada: 1 } });

    await promesa;

    expect(Plantilla.bulkCreate).toHaveBeenCalledWith([
      { id_categoria: 1, id_temporada: 1, id_division: null, id_jugador: null, id_entrenador: null, id_delegado: null },
      { id_categoria: 2, id_temporada: 1, id_division: null, id_jugador: null, id_entrenador: null, id_delegado: null }
    ]);
    expect(res._status).toBe(201);
    expect(res._json.creadas).toBe(2);
    expect(res._json.omitidas).toBe(1);
  });
});
