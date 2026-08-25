import { describe, it, expect, beforeEach } from 'vitest';
import { Op } from 'sequelize';
import { Entrenamiento, Partido, Plantilla, Categoria, Lugar, Equipo } from './helpers/models.js';
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
    id_plantilla: 10,
    fecha: '2026-01-01',
    id_lugar: 2,
    recurrente: false,
    plantilla: {
      id: 10,
      id_categoria: 3,
      id_temporada: 1,
      categoria: { id: 3, nombre: 'Alevín' },
      temporada: { id: 1, nombre: '2025/26' }
    },
    lugar: { id: 2, nombre: 'Municipal' }
  };

  const partido = {
    id: 4,
    id_plantilla: 10,
    fecha: '2026-01-02',
    incidencias: null,
    id_lugar: 2,
    id_equipo: 5,
    es_local: true,
    equipo: { id: 5, nombre: 'Rival FC', escudo: null, localidad: 'Rival City' },
    lugar: { id: 2, nombre: 'Municipal' },
    plantilla: {
      id: 10,
      id_categoria: 3,
      id_temporada: 1,
      categoria: { id: 3, nombre: 'Alevín' },
      temporada: { id: 1, nombre: '2025/26' }
    },
    jornada: { jornada: 5 },
    equipoLocal: { id: 5, nombre: 'Rival FC', escudo: null, localidad: 'Rival City' },
    equipoVisitante: { id: 6, nombre: 'Local FC', escudo: null, localidad: 'Local City' },
    Resultados: [{ id: 1, resultado: '2-1', incidencias: null }]
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
      base_id: 1,
      titulo: 'Entrenamiento · Alevín',
      inicio: '2026-01-01',
      lugar: 'Municipal',
      id_lugar: 2,
      incidencias: null,
      plantilla: { id: 10, id_categoria: 3, id_temporada: 1, categoria: { id: 3, nombre: 'Alevín' }, temporada: { id: 1, nombre: '2025/26' } },
      categoria: { id: 3, nombre: 'Alevín' },
      recurrente: false
    });
    expect(res._json[1].id).toBe('partido-4');
    expect(res._json[1].titulo).toBe('Alevín vs Rival FC');
  });

  it('invierte el título si el partido es visitante', async () => {
    const partidoVisitante = { ...partido, es_local: false, equipo: { id: 5, nombre: 'Rival FC', escudo: null, localidad: 'Rival City' } };
    Entrenamiento.findAll.mockResolvedValue([]);
    Partido.findAll.mockResolvedValue([partidoVisitante]);
    const { promesa, res } = llamar(ctrl.eventos);

    await promesa;

    expect(res._json[0].titulo).toBe('Rival FC vs Alevín');
    expect(res._json[0].es_local).toBe(false);
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

  it('propaga el filtro por plantilla al entrenamiento base', async () => {
    Entrenamiento.findAll.mockResolvedValue([]);
    Partido.findAll.mockResolvedValue([]);
    const { promesa, res } = llamar(ctrl.eventos, { query: { id_plantilla: '10' } });

    await promesa;

    const entrenamientoArgs = Entrenamiento.findAll.mock.calls[0][0];
    expect(entrenamientoArgs.where).toEqual({ id_usuario: 1, id_plantilla: '10' });
  });

  it('filtra por el usuario autenticado', async () => {
    Entrenamiento.findAll.mockResolvedValue([]);
    Partido.findAll.mockResolvedValue([]);
    const { promesa } = llamar(ctrl.eventos, { user: { id: 5, usuario: 'juan' } });

    await promesa;

    const entrenamientoArgs = Entrenamiento.findAll.mock.calls[0][0];
    expect(entrenamientoArgs.where.id_usuario).toBe(5);
    const partidoArgs = Partido.findAll.mock.calls[0][0];
    expect(partidoArgs.where.id_usuario).toBe(5);
  });

  it('acota las fechas de los entrenamientos por el rango', async () => {
    Entrenamiento.findAll.mockResolvedValue([]);
    Partido.findAll.mockResolvedValue([]);
    const { promesa, res } = llamar(ctrl.eventos, { query: { desde: '2026-01-01', hasta: '2026-12-31' } });

    await promesa;

    const entrenamientoArgs = Entrenamiento.findAll.mock.calls[0][0];
    expect(entrenamientoArgs.where.fecha).toEqual({ [Op.gte]: new Date('2026-01-01'), [Op.lte]: new Date('2026-12-31') });

    const partidoArgs = Partido.findAll.mock.calls[0][0];
    expect(partidoArgs.where.fecha).toEqual({ [Op.gte]: new Date('2026-01-01'), [Op.lte]: new Date('2026-12-31') });
  });
});