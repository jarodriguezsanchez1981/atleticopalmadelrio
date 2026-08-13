import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Op } from 'sequelize';
import { Entrenamiento, EntrenamientoSemanal, EntrenamientoJugador } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/entrenamiento.controller.js';

describe('Sección Entrenamientos · entrenamiento.controller', () => {
  beforeEach(() => {
    Entrenamiento.findAll.mockReset();
    Entrenamiento.findByPk.mockReset();
    Entrenamiento.create.mockReset();
    Entrenamiento.destroy.mockReset();
    EntrenamientoSemanal.bulkCreate.mockReset();
    EntrenamientoSemanal.destroy.mockReset();
    EntrenamientoJugador.destroy.mockReset();
    EntrenamientoJugador.bulkCreate.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve los entrenamientos sin filtros', async () => {
    const entrenamientos = [{ id: 1, fecha: '2026-01-01' }];
    Entrenamiento.findAll.mockResolvedValue(entrenamientos);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(Entrenamiento.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ order: [['fecha', 'ASC']], include: expect.any(Array) })
    );
    expect(res._json[0]).toEqual({ id: 1, fecha: '2026-01-01', ids_presentes: [], ids_ausentes: [], asistencia_tipo: 'total' });
  });

  it('listar filtra por categoría y lugar', async () => {
    Entrenamiento.findAll.mockResolvedValue([]);
    const { promesa, res } = llamar(ctrl.listar, { query: { id_categoria: '2', id_lugar: '3' } });

    await promesa;

    expect(Entrenamiento.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_categoria: '2', id_lugar: '3' } })
    );
  });

  it('listar filtra por rango de fechas', async () => {
    Entrenamiento.findAll.mockResolvedValue([]);
    const { promesa, res } = llamar(ctrl.listar, { query: { desde: '2026-01-01', hasta: '2026-12-31' } });

    await promesa;

    const llamada = Entrenamiento.findAll.mock.calls[0][0];
    expect(llamada.where.fecha).toBeDefined();
    expect(llamada.where.fecha[Op.gte]).toEqual(new Date('2026-01-01'));
    expect(llamada.where.fecha[Op.lte]).toEqual(new Date('2026-12-31'));
  });

  it('obtener devuelve 404 si no existe', async () => {
    Entrenamiento.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ message: 'Entrenamiento no encontrado.' });
  });

  it('obtener devuelve el entrenamiento por id', async () => {
    const entrenamiento = { id: 3, fecha: '2026-01-01' };
    Entrenamiento.findByPk.mockResolvedValue(entrenamiento);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '3' } });

    await promesa;

    expect(Entrenamiento.findByPk).toHaveBeenCalledWith('3', expect.objectContaining({ include: expect.any(Array) }));
    expect(res._json).toEqual({ id: 3, fecha: '2026-01-01', ids_presentes: [], ids_ausentes: [], asistencia_tipo: 'total' });
  });

  it('crear valida campos obligatorios', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { id_categoria: 1 } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Categoría, fecha y lugar son obligatorios.');
    expect(Entrenamiento.create).not.toHaveBeenCalled();
  });

  it('crear un registro base y un semanal único con el usuario autenticado', async () => {
    const creado = { id: 5 };
    const completo = { id: 5, categoria: null, lugar: null };
    Entrenamiento.create.mockResolvedValue(creado);
    Entrenamiento.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_categoria: 1, fecha: '2026-01-01', id_lugar: 2 }
    });

    await promesa;

    expect(Entrenamiento.create).toHaveBeenCalledWith({
      id_categoria: 1, fecha: '2026-01-01', hasta: null, id_lugar: 2, id_usuario: 7, recurrente: 0
    });
    expect(EntrenamientoSemanal.bulkCreate).toHaveBeenCalledWith([
      { id_entrenamiento: 5, fecha_entrenamiento: expect.any(Date), incidencias: null }
    ]);
    expect(res._status).toBe(201);
    expect(res._json).toEqual({ id: 5, categoria: null, lugar: null, ids_presentes: [], ids_ausentes: [], asistencia_tipo: 'total' });
  });

  it('crear recurrente guarda un solo registro base + un semanal por semana hasta la fecha límite', async () => {
    Entrenamiento.create.mockResolvedValueOnce({ id: 1 });
    Entrenamiento.findByPk.mockResolvedValueOnce({ id: 1, fecha: '2026-01-05', hasta: '2026-01-15', categoria: null, lugar: null });
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: {
        id_categoria: 1, fecha: '2026-01-05', id_lugar: 2,
        recurrente: 1, hasta: '2026-01-15'
      }
    });

    await promesa;

    expect(Entrenamiento.create).toHaveBeenCalledTimes(1);
    expect(Entrenamiento.create).toHaveBeenCalledWith(
      expect.objectContaining({ recurrente: 1, hasta: '2026-01-15' })
    );
    const filas = EntrenamientoSemanal.bulkCreate.mock.calls[0][0];
    expect(filas).toHaveLength(2);
    const fechas = filas.map((f) => new Date(f.fecha_entrenamiento).getDate());
    expect(fechas).toEqual([5, 12]);
    expect(res._status).toBe(201);
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Entrenamiento.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { fecha: 'x' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar guarda los cambios sin regenerar semanales', async () => {
    const entrenamiento = { id: 1, id_lugar: 1, save: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, id_lugar: 2, categoria: null, lugar: null };
    Entrenamiento.findByPk.mockResolvedValueOnce(entrenamiento).mockResolvedValueOnce(actualizado);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { id_lugar: 2 } });

    await promesa;

    expect(entrenamiento.id_lugar).toBe(2);
    expect(entrenamiento.save).toHaveBeenCalled();
    expect(EntrenamientoSemanal.destroy).not.toHaveBeenCalled();
    expect(res._json).toEqual({ id: 1, id_lugar: 2, categoria: null, lugar: null, ids_presentes: [], ids_ausentes: [], asistencia_tipo: 'total' });
  });

  it('actualizar regenera los semanales si cambia fecha o recurrencia', async () => {
    const entrenamiento = { id: 1, id_lugar: 1, fecha: '2026-01-05', recurrente: 1, hasta: '2026-01-15', save: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, fecha: '2026-01-05', categoria: null, lugar: null };
    Entrenamiento.findByPk.mockResolvedValueOnce(entrenamiento).mockResolvedValueOnce(actualizado);
    const { promesa } = llamar(ctrl.actualizar, {
      params: { id: '1' },
      body: { recurrente: 1, hasta: '2026-01-15' }
    });

    await promesa;

    expect(EntrenamientoSemanal.destroy).toHaveBeenCalledWith({ where: { id_entrenamiento: 1 } });
    const filas = EntrenamientoSemanal.bulkCreate.mock.calls[0][0];
    expect(filas).toHaveLength(2);
  });

  it('crear guarda asistencias parciales con incidencias si asistencia !== total', async () => {
    const creado = { id: 8 };
    const completo = { id: 8, categoria: null, lugar: null, asistencias: [] };
    Entrenamiento.create.mockResolvedValue(creado);
    Entrenamiento.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: {
        id_categoria: 1, fecha: '2026-01-01', id_lugar: 2, asistencia: 'parcial',
        asistencias: [
          { id_jugador: 11, asistencia: true },
          { id_jugador: 12, asistencia: false, incidencias: 'Lesión de rodilla' }
        ]
      }
    });

    await promesa;

    expect(EntrenamientoJugador.destroy).toHaveBeenCalledWith({ where: { id_entrenamiento: 8 } });
    expect(EntrenamientoJugador.bulkCreate).toHaveBeenCalledWith([
      { id_entrenamiento: 8, id_jugador: 11, asistencia: true, incidencias: null },
      { id_entrenamiento: 8, id_jugador: 12, asistencia: false, incidencias: 'Lesión de rodilla' }
    ]);
    expect(res._status).toBe(201);
  });

  it('crear con asistencia total no inserta registros de jugadores', async () => {
    const creado = { id: 9 };
    const completo = { id: 9, categoria: null, lugar: null, asistencias: [] };
    Entrenamiento.create.mockResolvedValue(creado);
    Entrenamiento.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_categoria: 1, fecha: '2026-01-01', id_lugar: 2, asistencia: 'total' }
    });

    await promesa;

    expect(EntrenamientoJugador.destroy).not.toHaveBeenCalled();
    expect(EntrenamientoJugador.bulkCreate).not.toHaveBeenCalled();
    expect(res._status).toBe(201);
  });

  it('crear sigue soportando ids_presentes/ids_ausentes (retrocompatibilidad)', async () => {
    const creado = { id: 10 };
    const completo = { id: 10, categoria: null, lugar: null, asistencias: [] };
    Entrenamiento.create.mockResolvedValue(creado);
    Entrenamiento.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_categoria: 1, fecha: '2026-01-01', id_lugar: 2, ids_presentes: [11], ids_ausentes: [13] }
    });

    await promesa;

    expect(EntrenamientoJugador.bulkCreate).toHaveBeenCalledWith([
      { id_entrenamiento: 10, id_jugador: 11, asistencia: true, incidencias: null },
      { id_entrenamiento: 10, id_jugador: 13, asistencia: false, incidencias: null }
    ]);
    expect(res._status).toBe(201);
  });

  it('actualizar reemplaza asistencias si trae detalle parcial', async () => {
    const entrenamiento = { id: 1, id_lugar: 1, save: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, id_lugar: 1, categoria: null, lugar: null, asistencias: [] };
    Entrenamiento.findByPk.mockResolvedValueOnce(entrenamiento).mockResolvedValueOnce(actualizado);
    const { promesa } = llamar(ctrl.actualizar, {
      params: { id: '1' },
      body: {
        asistencia: 'parcial',
        asistencias: [
          { id_jugador: 21, asistencia: true },
          { id_jugador: 22, asistencia: false, incidencias: 'Examen' }
        ]
      }
    });

    await promesa;

    expect(EntrenamientoJugador.destroy).toHaveBeenCalledWith({ where: { id_entrenamiento: 1 } });
    expect(EntrenamientoJugador.bulkCreate).toHaveBeenCalledWith([
      { id_entrenamiento: 1, id_jugador: 21, asistencia: true, incidencias: null },
      { id_entrenamiento: 1, id_jugador: 22, asistencia: false, incidencias: 'Examen' }
    ]);
  });

  it('actualizar con asistencia total borra todos los registros', async () => {
    const entrenamiento = { id: 1, id_lugar: 1, save: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, id_lugar: 1, categoria: null, lugar: null, asistencias: [] };
    Entrenamiento.findByPk.mockResolvedValueOnce(entrenamiento).mockResolvedValueOnce(actualizado);
    const { promesa } = llamar(ctrl.actualizar, {
      params: { id: '1' },
      body: { asistencia: 'total' }
    });

    await promesa;

    expect(EntrenamientoJugador.destroy).toHaveBeenCalledWith({ where: { id_entrenamiento: 1 } });
    expect(EntrenamientoJugador.bulkCreate).not.toHaveBeenCalled();
  });

  it('eliminar elimina y responde 204', async () => {
    Entrenamiento.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });

    await promesa;

    expect(Entrenamiento.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(res._status).toBe(204);
  });

  it('eliminar devuelve 404 si no encuentra nada', async () => {
    Entrenamiento.destroy.mockResolvedValue(0);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('eliminarSemanal elimina una sesión concreta y responde 204', async () => {
    EntrenamientoSemanal.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminarSemanal, { params: { id: '42' } });

    await promesa;

    expect(EntrenamientoSemanal.destroy).toHaveBeenCalledWith({ where: { id: '42' } });
    expect(res._status).toBe(204);
  });

  it('eliminarSemanal devuelve 404 si no encuentra nada', async () => {
    EntrenamientoSemanal.destroy.mockResolvedValue(0);
    const { promesa, res } = llamar(ctrl.eliminarSemanal, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
  });
});