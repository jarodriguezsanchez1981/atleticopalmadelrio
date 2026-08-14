import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Lugar, TipoFutbol } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/lugar.controller.js';

describe('Sección Lugares · lugar.controller', () => {
  beforeEach(() => {
    Lugar.findAll.mockReset();
    Lugar.findOne.mockReset();
    Lugar.create.mockReset();
    Lugar.destroy.mockReset();
    TipoFutbol.count.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  const includeTipos = [
    {
      model: TipoFutbol,
      as: 'tiposFutbol',
      attributes: ['id', 'nombre'],
      through: { attributes: [] }
    }
  ];

  it('listar devuelve todos los lugares ordenados por nombre', async () => {
    const lugares = [{ id: 1, nombre: 'Municipal', tiposFutbol: [] }];
    Lugar.findAll.mockResolvedValue(lugares);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(Lugar.findAll).toHaveBeenCalledWith({
      where: undefined,
      include: includeTipos,
      order: [['nombre', 'ASC']]
    });
    expect(res._json).toEqual([{ id: 1, nombre: 'Municipal', tiposFutbol: [], ids_tipos_futbol: [] }]);
  });

  it('listar filtra por id_tipofutbol si se indica', async () => {
    Lugar.findAll.mockResolvedValue([]);
    const { promesa } = llamar(ctrl.listar, { query: { id_tipofutbol: '1' } });

    await promesa;

    expect(Lugar.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { '$tiposFutbol.id$': '1' } }));
  });

  it('obtener devuelve el lugar por id', async () => {
    const lugar = { id: 3, nombre: 'Anexo', tiposFutbol: [{ id: 1 }] };
    Lugar.findOne.mockResolvedValue(lugar);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '3' } });

    await promesa;

    expect(Lugar.findOne).toHaveBeenCalledWith({ where: { id: '3' }, include: includeTipos });
    expect(res._json).toEqual({ ...lugar, ids_tipos_futbol: [1] });
  });

  it('obtener devuelve 404 si no existe', async () => {
    Lugar.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ message: 'Lugar no encontrado.' });
  });

  it('crear valida nombre y tipos de fútbol obligatorios', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: {} });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El nombre y al menos un tipo de fútbol son obligatorios.');
    expect(Lugar.create).not.toHaveBeenCalled();
  });

  it('crear valida que los tipos de fútbol existan', async () => {
    TipoFutbol.count.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'Campo', ids_tipos_futbol: [1, 99] } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Algún tipo de fútbol indicado no existe.');
    expect(Lugar.create).not.toHaveBeenCalled();
  });

  it('crear crea el lugar, asigna tipos y devuelve 201', async () => {
    const lugar = { id: 5, setTiposFutbol: vi.fn().mockResolvedValue() };
    const creado = { id: 5, nombre: 'Campo de fútbol', tiposFutbol: [{ id: 1 }] };
    TipoFutbol.count.mockResolvedValue(1);
    Lugar.create.mockResolvedValue(lugar);
    Lugar.findOne.mockResolvedValue(creado);
    const { promesa, res } = llamar(ctrl.crear, { body: { nombre: 'Campo de fútbol', ids_tipos_futbol: [1] } });

    await promesa;

    expect(TipoFutbol.count).toHaveBeenCalledWith({ where: { id: [1] } });
    expect(Lugar.create).toHaveBeenCalledWith({ nombre: 'Campo de fútbol' });
    expect(lugar.setTiposFutbol).toHaveBeenCalledWith([1]);
    expect(res._status).toBe(201);
    expect(res._json).toEqual({ ...creado, ids_tipos_futbol: [1] });
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Lugar.findOne.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'X' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar guarda los cambios de nombre', async () => {
    const lugar = { id: 1, nombre: 'Viejo', save: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, nombre: 'Nuevo', tiposFutbol: [] };
    Lugar.findOne.mockResolvedValueOnce(lugar).mockResolvedValueOnce(actualizado);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { nombre: 'Nuevo' } });

    await promesa;

    expect(lugar.nombre).toBe('Nuevo');
    expect(lugar.save).toHaveBeenCalled();
    expect(res._json).toEqual({ ...actualizado, ids_tipos_futbol: [] });
  });

  it('actualizar valida tipos al cambiarlos', async () => {
    const lugar = { id: 1, nombre: 'Viejo', save: vi.fn().mockResolvedValue(), setTiposFutbol: vi.fn() };
    Lugar.findOne.mockResolvedValue(lugar);
    TipoFutbol.count.mockResolvedValue(0);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { ids_tipos_futbol: [99] } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Algún tipo de fútbol indicado no existe.');
    expect(lugar.setTiposFutbol).not.toHaveBeenCalled();
  });

  it('actualizar asigna los nuevos tipos de fútbol', async () => {
    const lugar = { id: 1, nombre: 'Viejo', save: vi.fn().mockResolvedValue(), setTiposFutbol: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, nombre: 'Viejo', tiposFutbol: [{ id: 1 }, { id: 2 }] };
    Lugar.findOne.mockResolvedValueOnce(lugar).mockResolvedValueOnce(actualizado);
    TipoFutbol.count.mockResolvedValue(2);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { ids_tipos_futbol: [1, 2] } });

    await promesa;

    expect(lugar.setTiposFutbol).toHaveBeenCalledWith([1, 2]);
    expect(res._json).toEqual({ ...actualizado, ids_tipos_futbol: [1, 2] });
  });

  it('eliminar elimina y responde 204', async () => {
    Lugar.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });

    await promesa;

    expect(Lugar.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(res._status).toBe(204);
  });

  it('eliminar devuelve 404 si no encuentra nada', async () => {
    Lugar.destroy.mockResolvedValue(0);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
  });
});