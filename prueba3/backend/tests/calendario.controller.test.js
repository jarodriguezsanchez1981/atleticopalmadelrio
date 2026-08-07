import { describe, it, expect, beforeEach } from 'vitest';
import { Op } from 'sequelize';
import { Entrenamiento, Partido, Categoria, Lugar } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/calendario.controller.js';

describe('Calendario · calendario.controller', () => {
  beforeEach(() => {
    Entrenamiento.findAll.mockReset();
    Partido.findAll.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  const entrenamiento = {
    id: 1,
    fecha: '2026-01-01',
    incidencias: null,
    id_lugar: 2,
    lugar: { id: 2, nombre: 'Municipal' },
    categoria: { id: 3, nombre: 'Alevín' }
  };

  const partido = {
    id: 4,
    fecha: '2026-01-02',
    incidencias: null,
    id_lugar: 2,
    id_equipo: 5,
    equipo: { id: 5, nombre: 'Rival FC' },
    lugar: { id: 2, nombre: 'Municipal' },
    categoria: { id: 3, nombre: 'Alevín' }
  };

  it('devuelve entrenamientos y partidos combinados por defecto', async () => {
    Entrenamiento.findAll.mockResolvedValueOnce([entrenamiento]).mockResolvedValueOnce([]);
    Partido.findAll.mockResolvedValue([partido]);
    const { promesa, res } = llamar(ctrl.eventos);

    await promesa;

    expect(Entrenamiento.findAll).toHaveBeenCalled();
    expect(Partido.findAll).toHaveBeenCalled();
    expect(res._json).toHaveLength(2);
    expect(res._json[0]).toEqual({
      id: 'entrenamiento-1',
      tipo: 'entrenamiento',
      titulo: 'Entrenamiento · Alevín',
      inicio: '2026-01-01',
      lugar: 'Municipal',
      id_lugar: 2,
      incidencias: null,
      categoria: { id: 3, nombre: 'Alevín' },
      recurrente: false
    });
    expect(res._json[1].id).toBe('partido-4');
    expect(res._json[1].titulo).toBe('Partido vs Rival FC · Alevín');
  });

  it('solo consulta entrenamientos si tipo=entrenamiento', async () => {
    Entrenamiento.findAll.mockResolvedValueOnce([entrenamiento]).mockResolvedValueOnce([]);
    const { promesa, res } = llamar(ctrl.eventos, { query: { tipo: 'entrenamiento' } });

    await promesa;

    expect(Partido.findAll).not.toHaveBeenCalled();
    expect(res._json).toHaveLength(1);
  });

  it('solo consulta partidos si tipo=partido', async () => {
    Partido.findAll.mockResolvedValue([partido]);
    const { promesa, res } = llamar(ctrl.eventos, { query: { tipo: 'partido' } });

    await promesa;

    expect(Entrenamiento.findAll).not.toHaveBeenCalled();
    expect(res._json).toHaveLength(1);
  });

  it('propaga el filtro por categoría', async () => {
    Entrenamiento.findAll.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    Partido.findAll.mockResolvedValue([]);
    const { promesa, res } = llamar(ctrl.eventos, { query: { id_categoria: '3' } });

    await promesa;

    expect(Entrenamiento.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { id_categoria: '3', id_usuario: 1, recurrente: false }
    }));
  });

  it('filtra por el usuario autenticado', async () => {
    Entrenamiento.findAll.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    Partido.findAll.mockResolvedValue([]);
    const { promesa } = llamar(ctrl.eventos, { user: { id: 5, usuario: 'juan' } });

    await promesa;

    const entreno = Entrenamiento.findAll.mock.calls[0][0];
    expect(entreno.where.id_usuario).toBe(5);
    const partido = Partido.findAll.mock.calls[0][0];
    expect(partido.where.id_usuario).toBe(5);
  });

  it('consulta ambos modelos al pasar un rango de fechas', async () => {
    Entrenamiento.findAll.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    Partido.findAll.mockResolvedValue([]);
    const { promesa, res } = llamar(ctrl.eventos, { query: { desde: '2026-01-01', hasta: '2026-12-31' } });

    await promesa;

    const entreno = Entrenamiento.findAll.mock.calls[0][0];
    expect(entreno.where.fecha).toEqual({ [Op.between]: [new Date('2026-01-01'), new Date('2026-12-31')] });

    const partido = Partido.findAll.mock.calls[0][0];
    expect(partido.where.fecha).toEqual({ [Op.between]: [new Date('2026-01-01'), new Date('2026-12-31')] });
  });

  it('expande los entrenamientos recurrentes cada semana dentro del rango', async () => {
    const recurrente = {
      id: 9,
      fecha: '2026-01-05',
      incidencias: null,
      id_lugar: 2,
      lugar: { id: 2, nombre: 'Municipal' },
      categoria: { id: 3, nombre: 'Alevín' },
      recurrente: true
    };
    Entrenamiento.findAll.mockResolvedValueOnce([]).mockResolvedValueOnce([recurrente]);
    Partido.findAll.mockResolvedValue([]);
    const { promesa, res } = llamar(ctrl.eventos, {
      query: { desde: '2026-01-01', hasta: '2026-01-26' }
    });

    await promesa;

    const recurrentes = res._json.filter((e) => e.recurrente);
    expect(recurrentes).toHaveLength(4);
    expect(recurrentes[0].inicio).toEqual(new Date('2026-01-05'));
    expect(recurrentes[1].inicio).toEqual(new Date('2026-01-12'));
    expect(recurrentes[3].inicio).toEqual(new Date('2026-01-26'));
  });
});