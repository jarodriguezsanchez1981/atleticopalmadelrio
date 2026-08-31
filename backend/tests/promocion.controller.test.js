import { describe, it, expect, beforeEach } from 'vitest';
import { Promocion, Plantilla, Categoria, Jugador } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/promocion.controller.js';

describe('Sección Promociones · promocion.controller', () => {
  beforeEach(() => {
    Promocion.findAll.mockReset();
    Promocion.findOne.mockReset();
    Promocion.create.mockReset();
    Promocion.destroy.mockReset();
    Plantilla.findOne.mockReset();
    Categoria.findOne.mockReset();
    Jugador.findOne.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res };
  }

  it('listar devuelve las promociones', async () => {
    const promociones = [{ id: 1, id_plantilla: 1, id_categoria: 2, id_jugador: 5 }];
    Promocion.findAll.mockResolvedValue(promociones);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(Promocion.findAll).toHaveBeenCalled();
    expect(res._json).toEqual(promociones);
  });

  it('crear exige plantilla, categoría y jugador', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: {} });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Plantilla, categoría y jugador son obligatorios.');
    expect(Promocion.create).not.toHaveBeenCalled();
  });

  it('crear valida que la plantilla exista', async () => {
    Plantilla.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.crear, { body: { id_plantilla: 99, id_categoria: 2, id_jugador: 5 } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('La plantilla indicada no existe.');
    expect(Promocion.create).not.toHaveBeenCalled();
  });

  it('crear valida que la categoría exista', async () => {
    Plantilla.findOne.mockResolvedValue({ id: 1 });
    Categoria.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.crear, { body: { id_plantilla: 1, id_categoria: 99, id_jugador: 5 } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('La categoría indicada no existe.');
    expect(Promocion.create).not.toHaveBeenCalled();
  });

  it('crear valida que el jugador exista', async () => {
    Plantilla.findOne.mockResolvedValue({ id: 1 });
    Categoria.findOne.mockResolvedValue({ id: 2 });
    Jugador.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.crear, { body: { id_plantilla: 1, id_categoria: 2, id_jugador: 99 } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El jugador indicado no existe.');
    expect(Promocion.create).not.toHaveBeenCalled();
  });

  it('crear crea la promoción y devuelve 201', async () => {
    Plantilla.findOne.mockResolvedValue({ id: 1 });
    Categoria.findOne.mockResolvedValue({ id: 2 });
    Jugador.findOne.mockResolvedValue({ id: 5 });
    const creada = { id: 5, id_plantilla: 1, id_categoria: 2, id_jugador: 5 };
    Promocion.create.mockResolvedValue(creada);
    Promocion.findOne.mockResolvedValue(creada);
    const { promesa, res } = llamar(ctrl.crear, { body: { id_plantilla: 1, id_categoria: 2, id_jugador: 5 } });

    await promesa;

    expect(Promocion.create).toHaveBeenCalledWith({ id_plantilla: 1, id_categoria: 2, id_jugador: 5 });
    expect(res._status).toBe(201);
    expect(res._json).toEqual(creada);
  });

  it('eliminar elimina y responde 204', async () => {
    Promocion.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });

    await promesa;

    expect(Promocion.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(res._status).toBe(204);
  });
});
