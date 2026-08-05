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
    equipo_rival: 'Rival FC',
    lugar: { id: 2, nombre: 'Municipal' },
    categoria: { id: 3, nombre: 'Alevín' }
  };

  it('devuelve entrenamientos y partidos combinados por defecto', async () => {
    Entrenamiento.findAll.mockResolvedValue([entrenamiento]);
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
      categoria: { id: 3, nombre: 'Alevín' }
    });
    expect(res._json[1].id).toBe('partido-4');
    expect(res._json[1].titulo).toBe('Partido vs Rival FC · Alevín');
  });

  it('solo consulta entrenamientos si tipo=entrenamiento', async () => {
    Entrenamiento.findAll.mockResolvedValue([entrenamiento]);
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
    Entrenamiento.findAll.mockResolvedValue([]);
    Partido.findAll.mockResolvedValue([]);
    const { promesa, res } = llamar(ctrl.eventos, { query: { id_categoria: '3' } });

    await promesa;

    expect(Entrenamiento.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { id_categoria: '3' }
    }));
  });

  it('consulta ambos modelos al pasar un rango de fechas', async () => {
    Entrenamiento.findAll.mockResolvedValue([]);
    Partido.findAll.mockResolvedValue([]);
    const { promesa, res } = llamar(ctrl.eventos, { query: { desde: '2026-01-01', hasta: '2026-12-31' } });

    await promesa;

    const entreno = Entrenamiento.findAll.mock.calls[0][0];
    expect(entreno.where.fecha).toBeDefined();
    expect(entreno.where.fecha[Op.gte]).toEqual(new Date('2026-01-01'));
    expect(entreno.where.fecha[Op.lte]).toEqual(new Date('2026-12-31'));

    const partido = Partido.findAll.mock.calls[0][0];
    expect(partido.where.fecha[Op.gte]).toEqual(new Date('2026-01-01'));
    expect(partido.where.fecha[Op.lte]).toEqual(new Date('2026-12-31'));
  });
});