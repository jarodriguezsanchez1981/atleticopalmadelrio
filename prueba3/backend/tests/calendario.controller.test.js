import { describe, it, expect, beforeEach } from 'vitest';
import { Op } from 'sequelize';
import { EntrenamientoSemanal, Partido } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/calendario.controller.js';

describe('Calendario · calendario.controller', () => {
  beforeEach(() => {
    EntrenamientoSemanal.findAll.mockReset();
    Partido.findAll.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  const semanal = {
    id: 10,
    fecha_entrenamiento: '2026-01-01',
    incidencias: null,
    entrenamiento: {
      id: 1,
      id_lugar: 2,
      recurrente: false,
      categoria: { id: 3, nombre: 'Alevín' },
      lugar: { id: 2, nombre: 'Municipal' }
    }
  };

  const partido = {
    id: 4,
    fecha: '2026-01-02',
    incidencias: null,
    id_lugar: 2,
    id_equipo: 5,
    es_local: true,
    equipo: { id: 5, nombre: 'Rival FC' },
    lugar: { id: 2, nombre: 'Municipal' },
    categoria: { id: 3, nombre: 'Alevín' }
  };

  it('devuelve entrenamientos (semana) y partidos combinados por defecto', async () => {
    EntrenamientoSemanal.findAll.mockResolvedValueOnce([semanal]);
    Partido.findAll.mockResolvedValue([partido]);
    const { promesa, res } = llamar(ctrl.eventos);

    await promesa;

    expect(EntrenamientoSemanal.findAll).toHaveBeenCalled();
    expect(Partido.findAll).toHaveBeenCalled();
    expect(res._json).toHaveLength(2);
    expect(res._json[0]).toEqual({
      id: 'entrenamiento-10',
      tipo: 'entrenamiento',
      base_id: 1,
      titulo: 'Entrenamiento · Alevín',
      inicio: '2026-01-01',
      lugar: 'Municipal',
      id_lugar: 2,
      incidencias: null,
      categoria: { id: 3, nombre: 'Alevín' },
      recurrente: false
    });
    expect(res._json[1].id).toBe('partido-4');
    expect(res._json[1].titulo).toBe('Alevín vs Rival FC');
  });

  it('invierte el título si el partido es visitante', async () => {
    const partidoVisitante = { ...partido, es_local: false };
    EntrenamientoSemanal.findAll.mockResolvedValueOnce([]);
    Partido.findAll.mockResolvedValue([partidoVisitante]);
    const { promesa, res } = llamar(ctrl.eventos);

    await promesa;

    expect(res._json[0].titulo).toBe('Rival FC vs Alevín');
    expect(res._json[0].es_local).toBe(false);
  });

  it('solo consulta entrenamientos si tipo=entrenamiento', async () => {
    EntrenamientoSemanal.findAll.mockResolvedValueOnce([semanal]);
    const { promesa, res } = llamar(ctrl.eventos, { query: { tipo: 'entrenamiento' } });

    await promesa;

    expect(Partido.findAll).not.toHaveBeenCalled();
    expect(res._json).toHaveLength(1);
  });

  it('solo consulta partidos si tipo=partido', async () => {
    Partido.findAll.mockResolvedValue([partido]);
    const { promesa, res } = llamar(ctrl.eventos, { query: { tipo: 'partido' } });

    await promesa;

    expect(EntrenamientoSemanal.findAll).not.toHaveBeenCalled();
    expect(res._json).toHaveLength(1);
  });

  it('propaga el filtro por categoría al entrenamiento base', async () => {
    EntrenamientoSemanal.findAll.mockResolvedValueOnce([]);
    Partido.findAll.mockResolvedValue([]);
    const { promesa, res } = llamar(ctrl.eventos, { query: { id_categoria: '3' } });

    await promesa;

    const semanalArgs = EntrenamientoSemanal.findAll.mock.calls[0][0];
    expect(semanalArgs.include[0].where).toEqual({ id_usuario: 1, id_categoria: '3' });
  });

  it('filtra por el usuario autenticado', async () => {
    EntrenamientoSemanal.findAll.mockResolvedValueOnce([]);
    Partido.findAll.mockResolvedValue([]);
    const { promesa } = llamar(ctrl.eventos, { user: { id: 5, usuario: 'juan' } });

    await promesa;

    const semanalArgs = EntrenamientoSemanal.findAll.mock.calls[0][0];
    expect(semanalArgs.include[0].where.id_usuario).toBe(5);
    const partido = Partido.findAll.mock.calls[0][0];
    expect(partido.where.id_usuario).toBe(5);
  });

  it('acota las fechas de los entrenamientos por el rango', async () => {
    EntrenamientoSemanal.findAll.mockResolvedValueOnce([]);
    Partido.findAll.mockResolvedValue([]);
    const { promesa, res } = llamar(ctrl.eventos, { query: { desde: '2026-01-01', hasta: '2026-12-31' } });

    await promesa;

    const semanalArgs = EntrenamientoSemanal.findAll.mock.calls[0][0];
    expect(semanalArgs.where.fecha_entrenamiento).toEqual({ [Op.gte]: new Date('2026-01-01'), [Op.lte]: new Date('2026-12-31') });

    const partido = Partido.findAll.mock.calls[0][0];
    expect(partido.where.fecha).toEqual({ [Op.gte]: new Date('2026-01-01'), [Op.lte]: new Date('2026-12-31') });
  });
});