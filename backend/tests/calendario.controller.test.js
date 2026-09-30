import { describe, it, expect, beforeEach } from 'vitest';
import { Op } from 'sequelize';
import { Entrenamiento, Partido, Plantilla, Categoria, Lugar, Equipo, Jornada, Torneo } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/calendario.controller.js';

describe('Calendario · calendario.controller', () => {
  beforeEach(() => {
    Entrenamiento.findAll.mockReset();
    Partido.findAll.mockReset();
    Jornada.findAll.mockReset();
    Torneo.findAll.mockReset();
    Torneo.findAll.mockResolvedValue([]);
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  function mockJornada(data) {
    const obj = { ...data };
    obj.toJSON = () => ({ ...obj });
    return obj;
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
    id_equipo_local: 73,
    id_equipo_visitante: 5,
    equipoLocal: { id: 73, nombre: 'PALMA DEL RIO ATLETICO C.F.', escudo: null, localidad: 'Palma' },
    equipoVisitante: { id: 5, nombre: 'Rival FC', escudo: null, localidad: 'Rival City' },
    lugar: { id: 2, nombre: 'Municipal' },
    plantilla: {
      id: 10,
      id_categoria: 3,
      id_temporada: 1,
      categoria: { id: 3, nombre: 'Alevín' },
      temporada: { id: 1, nombre: '2025/26' }
    },
    Resultados: [{ id: 1, resultado: '2-1', incidencias: null }]
  };

  it('devuelve entrenamientos y partidos combinados por defecto', async () => {
    Jornada.findAll.mockResolvedValue([mockJornada({
      id_plantilla: 10, fecha: '2026-01-02', jornada: 1,
      id_equipo_local: 73, id_equipo_visitante: 5,
      equipoLocal: { id: 73, nombre: 'PALMA DEL RIO ATLETICO C.F.', escudo: null, localidad: 'Palma' },
      equipoVisitante: { id: 5, nombre: 'Rival FC', escudo: null, localidad: 'Rival City' }
    })]);
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
    expect(res._json[1].titulo).toBe('PALMA DEL RIO ATLETICO C.F. vs Rival FC');
  });

  it('invierte el título si el partido es visitante', async () => {
    const partidoVisitante = {
      ...partido,
      id_equipo_local: 5,
      id_equipo_visitante: 73,
      equipoLocal: { id: 5, nombre: 'Rival FC', escudo: null, localidad: 'Rival City' },
      equipoVisitante: { id: 73, nombre: 'PALMA DEL RIO ATLETICO C.F.', escudo: null, localidad: 'Palma' }
    };
    Jornada.findAll.mockResolvedValue([mockJornada({
      id_plantilla: 10, fecha: '2026-01-02', jornada: 1,
      id_equipo_local: 5, id_equipo_visitante: 73,
      equipoLocal: { id: 5, nombre: 'Rival FC', escudo: null, localidad: 'Rival City' },
      equipoVisitante: { id: 73, nombre: 'PALMA DEL RIO ATLETICO C.F.', escudo: null, localidad: 'Palma' }
    })]);
    Entrenamiento.findAll.mockResolvedValue([]);
    Partido.findAll.mockResolvedValue([partidoVisitante]);
    const { promesa, res } = llamar(ctrl.eventos);

    await promesa;

    expect(res._json[0].titulo).toBe('Rival FC vs PALMA DEL RIO ATLETICO C.F.');
    expect(res._json[0].es_local).toBe(false);
  });

  it('solo consulta entrenamientos si tipo=entrenamiento', async () => {
    Entrenamiento.findAll.mockResolvedValue([entrenamiento]);
    const { promesa, res } = llamar(ctrl.eventos, { query: { tipo: 'entrenamiento' } });

    await promesa;

    expect(Jornada.findAll).not.toHaveBeenCalled();
    expect(Partido.findAll).not.toHaveBeenCalled();
    expect(res._json).toHaveLength(1);
  });

  it('solo consulta partidos si tipo=partido', async () => {
    Jornada.findAll.mockResolvedValue([mockJornada({
      id_plantilla: 10, fecha: '2026-01-02', jornada: 1,
      id_equipo_local: 73, id_equipo_visitante: 5,
      equipoLocal: { id: 73, nombre: 'PALMA', escudo: null, localidad: 'Palma' },
      equipoVisitante: { id: 5, nombre: 'Rival FC', escudo: null, localidad: 'Rival City' }
    })]);
    Partido.findAll.mockResolvedValue([partido]);
    const { promesa, res } = llamar(ctrl.eventos, { query: { tipo: 'partido' } });

    await promesa;

    expect(Entrenamiento.findAll).not.toHaveBeenCalled();
    expect(res._json).toHaveLength(1);
  });

  it('devuelve partidos aunque no haya jornadas (amistosos)', async () => {
    Jornada.findAll.mockResolvedValue([]);
    Entrenamiento.findAll.mockResolvedValue([entrenamiento]);
    Partido.findAll.mockResolvedValue([partido]);
    const { promesa, res } = llamar(ctrl.eventos);

    await promesa;

    expect(Partido.findAll).toHaveBeenCalled();
    expect(res._json).toHaveLength(2);
    expect(res._json[1].jornada).toBeNull();
  });

  it('etiqueta como Liga (con su número) un partido con jornada asignada', async () => {
    const partidoDeLiga = { ...partido, jornada: 3 };
    Entrenamiento.findAll.mockResolvedValue([]);
    Partido.findAll.mockResolvedValue([partidoDeLiga]);
    const { promesa, res } = llamar(ctrl.eventos);

    await promesa;

    expect(res._json[0].jornada).toBe(3);
  });

  it('propaga el filtro por plantilla al entrenamiento base', async () => {
    Jornada.findAll.mockResolvedValue([]);
    Entrenamiento.findAll.mockResolvedValue([]);
    const { promesa, res } = llamar(ctrl.eventos, { query: { id_plantilla: '10' } });

    await promesa;

    const entrenamientoArgs = Entrenamiento.findAll.mock.calls[0][0];
    expect(entrenamientoArgs.where).toEqual({ id_plantilla: '10' });
  });

  it('acota las fechas de los entrenamientos por el rango', async () => {
    Jornada.findAll.mockResolvedValue([]);
    Entrenamiento.findAll.mockResolvedValue([]);
    const { promesa, res } = llamar(ctrl.eventos, { query: { desde: '2026-01-01', hasta: '2026-12-31' } });

    await promesa;

    const entrenamientoArgs = Entrenamiento.findAll.mock.calls[0][0];
    expect(entrenamientoArgs.where.fecha).toEqual({ [Op.gte]: new Date('2026-01-01'), [Op.lte]: new Date('2026-12-31') });
  });

  it('no pide el escudo de los equipos en los eventos', async () => {
    Entrenamiento.findAll.mockResolvedValue([]);
    Partido.findAll.mockResolvedValue([]);
    const { promesa } = llamar(ctrl.eventos);

    await promesa;

    const includes = [...Partido.findAll.mock.calls[0][0].include, ...Torneo.findAll.mock.calls[0][0].include];
    const deEquipos = includes.filter((i) => i.model === Equipo);
    expect(deEquipos.length).toBe(3);
    deEquipos.forEach((i) => expect(i.attributes).not.toContain('escudo'));
  });

  it('escudos devuelve un mapa id → escudo solo de los ids válidos', async () => {
    Equipo.findAll.mockReset();
    Equipo.findAll.mockResolvedValue([{ id: 5, escudo: 'data:image/png;base64,AAA' }, { id: 73, escudo: null }]);
    const { promesa, res } = llamar(ctrl.escudos, { query: { ids: '5,73,5,abc,-1' } });

    await promesa;

    expect(Equipo.findAll.mock.calls[0][0].where).toEqual({ id: [5, 73] });
    expect(res._json).toEqual({ 5: 'data:image/png;base64,AAA', 73: null });
  });

  it('escudos limita el número de equipos por petición y no consulta sin ids', async () => {
    Equipo.findAll.mockReset();
    Equipo.findAll.mockResolvedValue([]);
    const muchos = Array.from({ length: 200 }, (_, i) => i + 1).join(',');
    const { promesa } = llamar(ctrl.escudos, { query: { ids: muchos } });
    await promesa;
    expect(Equipo.findAll.mock.calls[0][0].where.id.length).toBe(ctrl.MAX_ESCUDOS_POR_PETICION);

    Equipo.findAll.mockReset();
    const vacio = llamar(ctrl.escudos, { query: {} });
    await vacio.promesa;
    expect(Equipo.findAll).not.toHaveBeenCalled();
    expect(vacio.res._json).toEqual({});
  });
});
