import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Op } from 'sequelize';
import { Partido, Plantilla, Categoria, Entrenamiento, Torneo, Jornada, PartidoJugador, Jugador, PlantillaJugador, Sancion } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/partido.controller.js';

describe('Sección Partidos · partido.controller', () => {
  beforeEach(() => {
    Partido.findAll.mockReset();
    Partido.findByPk.mockReset();
    Partido.create.mockReset();
    Partido.destroy.mockReset();
    Partido.count.mockReset();
    Plantilla.findOne.mockReset();
    Categoria.findOne.mockReset();
    Entrenamiento.count.mockReset();
    Torneo.count.mockReset();
    Jornada.findOne.mockReset();
    PartidoJugador.destroy.mockReset();
    PartidoJugador.bulkCreate.mockReset();
    Sancion.findOne.mockReset();
    Sancion.create.mockReset();
    Sancion.destroy.mockReset();
  });

  function llamar(fn, overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: fn(req, res, next), res, req, next };
  }

  it('listar devuelve los partidos sin filtros', async () => {
    const partidos = [{ id: 1, id_equipo_local: 5, id_equipo_visitante: 6 }];
    Partido.findAll.mockResolvedValue(partidos);
    const { promesa, res } = llamar(ctrl.listar);

    await promesa;

    expect(Partido.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ order: [['fecha', 'ASC']], include: expect.any(Array) })
    );
    expect(res._json[0]).toEqual({ id: 1, id_equipo_local: 5, id_equipo_visitante: 6 });
  });

  it('listar incluye el orden de la categoría (para poder agrupar por categoría en el listado)', async () => {
    Partido.findAll.mockResolvedValue([]);
    const { promesa } = llamar(ctrl.listar);

    await promesa;

    const { include } = Partido.findAll.mock.calls[0][0];
    const plantillaInclude = include.find((i) => i.as === 'plantilla');
    const categoriaInclude = plantillaInclude.include.find((i) => i.as === 'categoria');
    expect(categoriaInclude.attributes).toContain('orden');
  });

  it('listar filtra por categoría para un entrenador', async () => {
    Partido.findAll.mockResolvedValue([]);
    const { promesa } = llamar(ctrl.listar, {
      user: { id: 16, rol: 'entrenador', id_categoria: 20 }
    });

    await promesa;

    expect(Partido.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.arrayContaining([
          expect.objectContaining({ as: 'plantilla', required: true, where: { id_categoria: 20 } })
        ])
      })
    );
  });

  it('listar no filtra por categoría para un coordinador', async () => {
    Partido.findAll.mockResolvedValue([]);
    const { promesa } = llamar(ctrl.listar, {
      user: { id: 1, rol: 'coordinador', id_categoria: null }
    });

    await promesa;

    const arg = Partido.findAll.mock.calls[0][0];
    const plantilla = arg.include.find((i) => i.as === 'plantilla');
    expect(plantilla.where).toBeUndefined();
  });

  it('listar filtra por plantilla, lugar y equipos', async () => {
    Partido.findAll.mockResolvedValue([]);
    const { promesa, res } = llamar(ctrl.listar, {
      query: { id_plantilla: '2', id_lugar: '3', id_equipo_local: '5', id_equipo_visitante: '6' }
    });

    await promesa;

    expect(Partido.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id_plantilla: '2',
          id_lugar: '3',
          id_equipo_local: '5',
          id_equipo_visitante: '6'
        }
      })
    );
  });

  it('listar filtra por rango de fechas', async () => {
    Partido.findAll.mockResolvedValue([]);
    const { promesa, res } = llamar(ctrl.listar, {
      query: { desde: '2026-01-01', hasta: '2026-12-31' }
    });

    await promesa;

    const llamada = Partido.findAll.mock.calls[0][0];
    expect(llamada.where.fecha).toBeDefined();
    expect(llamada.where.fecha[Op.gte]).toEqual(new Date('2026-01-01'));
    expect(llamada.where.fecha[Op.lte]).toEqual(new Date('2026-12-31'));
  });

  it('obtener devuelve 404 si no existe', async () => {
    Partido.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ message: 'Partido no encontrado.' });
  });

  it('obtener devuelve el partido por id', async () => {
    const partido = { id: 3, id_equipo_local: 5, id_equipo_visitante: 6 };
    Partido.findByPk.mockResolvedValue(partido);
    const { promesa, res } = llamar(ctrl.obtener, { params: { id: '3' } });

    await promesa;

    expect(Partido.findByPk).toHaveBeenCalledWith('3', expect.objectContaining({ include: expect.any(Array) }));
    expect(res._json).toEqual(expect.objectContaining({ id: 3, id_equipo_local: 5, id_equipo_visitante: 6 }));
  });

  it('crear valida campos obligatorios', async () => {
    const { promesa, res } = llamar(ctrl.crear, { body: { id_plantilla: 1 } });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Plantilla, fecha, equipo local y equipo visitante son obligatorios.');
    expect(Partido.create).not.toHaveBeenCalled();
  });

  it('crear rechaza si local y visitante son el mismo equipo', async () => {
    const { promesa, res } = llamar(ctrl.crear, {
      body: { id_plantilla: 1, fecha: '2026-01-01', id_equipo_local: 6, id_equipo_visitante: 6 }
    });

    await promesa;

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('El equipo local y el visitante no pueden ser el mismo.');
    expect(Partido.create).not.toHaveBeenCalled();
  });

  it('crear permite partido sin lugar (id_lugar opcional)', async () => {
    Partido.count.mockResolvedValue(0);
    Partido.findAll.mockResolvedValue([]);
    const creado = { id: 5, id_equipo_local: 6, id_equipo_visitante: 7 };
    const completo = { id: 5, id_equipo_local: 6, id_equipo_visitante: 7, plantilla: null, lugar: null, equipoLocal: null, equipoVisitante: null };
    Partido.create.mockResolvedValue(creado);
    Partido.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_plantilla: 1, fecha: '2026-01-01', id_equipo_local: 6, id_equipo_visitante: 7 }
    });

    await promesa;

    expect(Partido.create).toHaveBeenCalledWith(
      expect.objectContaining({ id_lugar: null })
    );
    expect(res._status).toBe(201);
  });

  it('crear rechaza duplicado: misma plantilla y mismo día', async () => {
    Partido.count.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_plantilla: 1, fecha: '2026-01-01', id_lugar: 2, id_equipo_local: 6, id_equipo_visitante: 7 }
    });

    await promesa;

    expect(res._status).toBe(409);
    expect(res._json.message).toBe('Esta plantilla ya tiene un partido ese día.');
    expect(Partido.create).not.toHaveBeenCalled();
  });

  it('crear rechaza duplicado de otra plantilla', async () => {
    Partido.count.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_plantilla: 2, fecha: '2026-01-01', id_lugar: 2, id_equipo_local: 6, id_equipo_visitante: 7 }
    });

    await promesa;

    expect(res._status).toBe(409);
    expect(res._json.message).toBe('Esta plantilla ya tiene un partido ese día.');
  });

  it('crear rechaza si la plantilla ya tiene un entrenamiento ese día', async () => {
    Partido.count.mockResolvedValue(0);
    Entrenamiento.count.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_plantilla: 1, fecha: '2026-01-01', id_lugar: 2, id_equipo_local: 6, id_equipo_visitante: 7 }
    });

    await promesa;

    expect(res._status).toBe(409);
    expect(res._json.message).toBe('Esta plantilla ya tiene un entrenamiento ese día.');
    expect(Partido.create).not.toHaveBeenCalled();
  });

  it('crear rechaza si la plantilla ya tiene un torneo ese día', async () => {
    Partido.count.mockResolvedValue(0);
    Entrenamiento.count.mockResolvedValue(0);
    Torneo.count.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_plantilla: 1, fecha: '2026-01-01', id_lugar: 2, id_equipo_local: 6, id_equipo_visitante: 7 }
    });

    await promesa;

    expect(res._status).toBe(409);
    expect(res._json.message).toBe('Esta plantilla ya tiene un torneo ese día.');
    expect(Partido.create).not.toHaveBeenCalled();
  });

  it('crear permite un partido por día distinto para la misma plantilla', async () => {
    Partido.count.mockResolvedValue(0);
    Partido.findAll.mockResolvedValue([]);
    const creado = { id: 5, id_equipo_local: 6, id_equipo_visitante: 7 };
    const completo = { id: 5, id_equipo_local: 6, id_equipo_visitante: 7, plantilla: null, lugar: null, equipoLocal: null, equipoVisitante: null };
    Partido.create.mockResolvedValue(creado);
    Partido.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_plantilla: 1, fecha: '2026-01-05T10:00:00', id_lugar: 2, id_equipo_local: 6, id_equipo_visitante: 7 }
    });

    await promesa;

    expect(res._status).toBe(201);
  });

  it('crear crea el partido con equipos y devuelve 201', async () => {
    Partido.count.mockResolvedValue(0);
    Partido.findAll.mockResolvedValue([]);
    const creado = { id: 5, id_equipo_local: 6, id_equipo_visitante: 7 };
    const completo = { id: 5, id_equipo_local: 6, id_equipo_visitante: 7, plantilla: null, lugar: null, equipoLocal: null, equipoVisitante: null };
    Partido.create.mockResolvedValue(creado);
    Partido.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_plantilla: 1, fecha: '2026-01-01T10:00:00', id_lugar: 2, id_equipo_local: 6, id_equipo_visitante: 7 }
    });

    await promesa;

    expect(Partido.create).toHaveBeenCalledWith({
      id_plantilla: 1,
      fecha: '2026-01-01T10:00:00',
      id_lugar: 2,
      id_equipo_local: 6,
      id_equipo_visitante: 7,
      id_usuario: 7,
      incidencias: null,
      jornada: null,
      resultado: null,
      codigo_acta: null,
      codigo_primaria: null
    });
    expect(res._status).toBe(201);
    expect(res._json).toEqual({ id: 5, id_equipo_local: 6, id_equipo_visitante: 7, plantilla: null, lugar: null, equipoLocal: null, equipoVisitante: null });
  });

  it('crear guarda los jugadores convocados y genera sanciones para el PALMA con tarjetas', async () => {
    Partido.count.mockResolvedValue(0);
    Partido.findAll.mockResolvedValue([]);
    const creado = { id: 5, id_equipo_local: 73, id_equipo_visitante: 7 };
    const completo = { id: 5, plantilla: null, lugar: null, equipoLocal: null, equipoVisitante: null };
    Partido.create.mockResolvedValue(creado);
    Partido.findByPk.mockResolvedValue(completo);
    Sancion.findOne.mockResolvedValue(null);

    const { promesa, res } = llamar(ctrl.crear, {
      body: {
        id_plantilla: 1, fecha: '2026-01-01T10:00:00', id_equipo_local: 73, id_equipo_visitante: 7,
        jugadores_local: [{ id_jugador: 5, tarjeta_amarilla: 2, tarjeta_roja: 0, goles: 1 }],
        jugadores_visitante: [{ id_jugador: 6, tarjeta_amarilla: 0, tarjeta_roja: 0, goles: 0 }]
      }
    });
    await promesa;

    expect(PartidoJugador.destroy).toHaveBeenCalledWith({ where: { id_partido: 5 } });
    expect(PartidoJugador.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id_partido: 5, id_jugador: 5, es_local: true, tarjeta_amarilla: 2, goles: 1 }),
        expect.objectContaining({ id_partido: 5, id_jugador: 6, es_local: false })
      ]),
      { ignoreDuplicates: true }
    );
    // Solo el jugador del PALMA (local, id 73) con tarjetas genera sanción; el visitante sin tarjetas no.
    expect(Sancion.create).toHaveBeenCalledWith({ id_partido: 5, id_jugador: 5, amarilla: 2, roja: 0 });
    expect(Sancion.create).not.toHaveBeenCalledWith(expect.objectContaining({ id_jugador: 6 }));
    expect(res._status).toBe(201);
  });

  it('crear rechaza si el lugar está ocupado a esa hora', async () => {
    Partido.count.mockResolvedValue(0);
    Plantilla.findOne.mockResolvedValue({ id: 1, categoria: { id: 1, tiempopartido: 90 } });
    Partido.findAll.mockResolvedValue([
      { id: 30, fecha: new Date('2026-01-01T09:00:00'), plantilla: { categoria: { id: 3, tiempopartido: 90 } } }
    ]);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_plantilla: 1, fecha: '2026-01-01T10:00:00', id_lugar: 2, id_equipo_local: 73, id_equipo_visitante: 7 }
    });

    await promesa;

    expect(res._status).toBe(409);
    expect(res._json.message).toBe('En esa fecha y hora hay otro partido planificado.');
    expect(Partido.create).not.toHaveBeenCalled();
  });

  it('crear no comprueba lugar cuando PALMA es visitante', async () => {
    Partido.count.mockResolvedValue(0);
    Plantilla.findOne.mockResolvedValue({ id: 1, categoria: { id: 1, tiempopartido: 90 } });
    Partido.findAll.mockResolvedValue([
      { id: 30, fecha: new Date('2026-01-01T09:00:00'), plantilla: { categoria: { id: 3, tiempopartido: 90 } } }
    ]);
    const creado = { id: 5, id_equipo_local: 6, id_equipo_visitante: 73 };
    const completo = { id: 5, id_equipo_local: 6, id_equipo_visitante: 73, plantilla: null, lugar: null, equipoLocal: null, equipoVisitante: null };
    Partido.create.mockResolvedValue(creado);
    Partido.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_plantilla: 1, fecha: '2026-01-01T10:00:00', id_lugar: 2, id_equipo_local: 6, id_equipo_visitante: 73 }
    });

    await promesa;

    expect(res._status).toBe(201);
  });

  it('crear permite si el lugar está libre aunque haya otro en otro lugar', async () => {
    Partido.count.mockResolvedValue(0);
    Plantilla.findOne.mockResolvedValue({ id: 1, categoria: { id: 1, tiempopartido: 90 } });
    Partido.findAll.mockResolvedValue([]);
    const creado = { id: 6, id_equipo_local: 73, id_equipo_visitante: 7 };
    const completo = { id: 6, id_equipo_local: 73, id_equipo_visitante: 7, plantilla: null, lugar: null, equipoLocal: null, equipoVisitante: null };
    Partido.create.mockResolvedValue(creado);
    Partido.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_plantilla: 1, fecha: '2026-01-01T10:00:00', id_lugar: 2, id_equipo_local: 73, id_equipo_visitante: 7 }
    });

    await promesa;

    expect(res._status).toBe(201);
  });

  it('crear permite si el lugar ocupado termina antes de la nueva hora', async () => {
    Partido.count.mockResolvedValue(0);
    Plantilla.findOne.mockResolvedValue({ id: 1, categoria: { id: 1, tiempopartido: 90 } });
    Partido.findAll.mockResolvedValue([
      { id: 30, fecha: new Date('2026-01-01T08:00:00'), plantilla: { categoria: { id: 3, tiempopartido: 60 } } }
    ]);
    const creado = { id: 6, id_equipo_local: 73, id_equipo_visitante: 7 };
    const completo = { id: 6, id_equipo_local: 73, id_equipo_visitante: 7, plantilla: null, lugar: null, equipoLocal: null, equipoVisitante: null };
    Partido.create.mockResolvedValue(creado);
    Partido.findByPk.mockResolvedValue(completo);
    const { promesa, res } = llamar(ctrl.crear, {
      user: { id: 7, usuario: 'admin' },
      body: { id_plantilla: 1, fecha: '2026-01-01T10:00:00', id_lugar: 2, id_equipo_local: 73, id_equipo_visitante: 7 }
    });

    await promesa;

    expect(res._status).toBe(201);
  });

  it('actualizar devuelve 404 si no existe', async () => {
    Partido.findByPk.mockResolvedValue(null);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { fecha: 'x' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  it('actualizar guarda los jugadores convocados cuando se envían', async () => {
    const partido = { id: 1, id_equipo_local: 73, id_equipo_visitante: 6, save: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, plantilla: null, lugar: null, equipoLocal: null, equipoVisitante: null };
    Partido.findByPk.mockResolvedValueOnce(partido).mockResolvedValueOnce(actualizado);
    Sancion.findOne.mockResolvedValue(null);

    const { promesa } = llamar(ctrl.actualizar, {
      params: { id: '1' },
      body: { jugadores_local: [{ id_jugador: 9, tarjeta_roja: 1 }], jugadores_visitante: [] }
    });
    await promesa;

    expect(PartidoJugador.destroy).toHaveBeenCalledWith({ where: { id_partido: 1 } });
    expect(PartidoJugador.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id_partido: 1, id_jugador: 9, es_local: true, tarjeta_roja: 1 })]),
      { ignoreDuplicates: true }
    );
    expect(Sancion.create).toHaveBeenCalledWith({ id_partido: 1, id_jugador: 9, amarilla: 0, roja: 1 });
  });

  it('actualizar guarda los cambios', async () => {
    const partido = { id: 1, id_equipo_local: 5, id_equipo_visitante: 6, save: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, id_equipo_local: 8, id_equipo_visitante: 6, plantilla: null, lugar: null, equipoLocal: null, equipoVisitante: null };
    Partido.findByPk.mockResolvedValueOnce(partido).mockResolvedValueOnce(actualizado);
    const { promesa, res } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { id_equipo_local: 8 } });

    await promesa;

    expect(partido.id_equipo_local).toBe(8);
    expect(partido.save).toHaveBeenCalled();
    expect(res._json).toEqual({ id: 1, id_equipo_local: 8, id_equipo_visitante: 6, plantilla: null, lugar: null, equipoLocal: null, equipoVisitante: null });
  });

  it('actualizar sincroniza la jornada vinculada al cambiar fecha y equipos', async () => {
    const partido = {
      id: 1, id_plantilla: 5, id_jornada: 20, fecha: '2026-01-01T09:00:00', id_equipo_local: 73, id_equipo_visitante: 6,
      save: vi.fn().mockResolvedValue()
    };
    const actualizado = { id: 1, plantilla: null, lugar: null, equipoLocal: null, equipoVisitante: null };
    Partido.findByPk.mockResolvedValueOnce(partido).mockResolvedValueOnce(actualizado);
    Partido.count.mockResolvedValue(0);
    Entrenamiento.count.mockResolvedValue(0);
    Torneo.count.mockResolvedValue(0);
    const jornadaVinculada = { id: 20, id_plantilla: 5, fecha: '2026-01-01', hora: '09:00', id_equipo_local: 73, id_equipo_visitante: 6, save: vi.fn().mockResolvedValue() };
    Jornada.findByPk.mockResolvedValue(jornadaVinculada);

    const { promesa } = llamar(ctrl.actualizar, {
      params: { id: '1' },
      body: { fecha: '2026-02-20T18:30:00', id_equipo_visitante: 9 }
    });
    await promesa;

    expect(Jornada.findByPk).toHaveBeenCalledWith(20);
    expect(jornadaVinculada.fecha).toBe('2026-02-20');
    expect(jornadaVinculada.hora).toBe('18:30:00');
    expect(jornadaVinculada.id_equipo_visitante).toBe(9);
    expect(jornadaVinculada.save).toHaveBeenCalled();
  });

  it('actualizar no falla si el partido editado no tiene jornada vinculada', async () => {
    const partido = { id: 1, id_plantilla: 5, fecha: '2026-01-01T09:00:00', id_equipo_local: 5, id_equipo_visitante: 6, save: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, plantilla: null, lugar: null, equipoLocal: null, equipoVisitante: null };
    Partido.findByPk.mockResolvedValueOnce(partido).mockResolvedValueOnce(actualizado);
    Partido.count.mockResolvedValue(0);
    Entrenamiento.count.mockResolvedValue(0);
    Torneo.count.mockResolvedValue(0);
    Jornada.findOne.mockResolvedValue(null);

    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { fecha: '2026-02-20T18:30:00' }
    });
    await promesa;

    expect(res._status).toBe(200);
  });

  it('actualizar guarda el resultado directamente en el partido', async () => {
    const partido = { id: 1, id_equipo_local: 5, id_equipo_visitante: 6, save: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, resultado: '2-1', plantilla: null, lugar: null, equipoLocal: null, equipoVisitante: null };
    Partido.findByPk.mockResolvedValueOnce(partido).mockResolvedValueOnce(actualizado);

    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { resultado: '2-1' }
    });
    await promesa;

    expect(partido.resultado).toBe('2-1');
    expect(partido.save).toHaveBeenCalled();
    expect(res._json.resultado).toBe('2-1');
  });

  it('actualizar guarda la jornada directamente en el partido', async () => {
    const partido = { id: 1, id_equipo_local: 5, id_equipo_visitante: 6, save: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, jornada: 4, plantilla: null, lugar: null, equipoLocal: null, equipoVisitante: null };
    Partido.findByPk.mockResolvedValueOnce(partido).mockResolvedValueOnce(actualizado);

    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { jornada: 4 }
    });
    await promesa;

    expect(partido.jornada).toBe(4);
    expect(partido.save).toHaveBeenCalled();
    expect(res._json.jornada).toBe(4);
  });

  it('actualizar rechaza una jornada no positiva', async () => {
    const partido = { id: 1, id_equipo_local: 5, id_equipo_visitante: 6, save: vi.fn().mockResolvedValue() };
    Partido.findByPk.mockResolvedValue(partido);

    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' }, body: { jornada: 0 }
    });
    await promesa;

    expect(res._status).toBe(400);
    expect(partido.save).not.toHaveBeenCalled();
  });

  it('actualizar rechaza si al cambiar de fecha el lugar está ocupado', async () => {
    const partido = { id: 1, id_equipo_local: 73, id_equipo_visitante: 6, id_lugar: 2, id_plantilla: 1, fecha: '2026-01-01T09:00:00', save: vi.fn().mockResolvedValue() };
    Partido.findByPk.mockResolvedValue(partido);
    Partido.count.mockResolvedValue(0);
    Plantilla.findOne.mockResolvedValue({ id: 1, categoria: { id: 1, tiempopartido: 90 } });
    Partido.findAll.mockResolvedValue([
      { id: 2, fecha: new Date('2026-01-05T10:00:00'), plantilla: { categoria: { id: 1, tiempopartido: 90 } } }
    ]);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' },
      body: { fecha: '2026-01-05T10:00:00' }
    });

    await promesa;

    expect(res._status).toBe(409);
    expect(res._json.message).toBe('En esa fecha y hora hay otro partido planificado.');
    expect(partido.save).not.toHaveBeenCalled();
  });

  it('actualizar permite mover la fecha si el lugar queda libre', async () => {
    const partido = { id: 1, id_equipo_local: 73, id_equipo_visitante: 6, id_lugar: 2, id_plantilla: 1, fecha: '2026-01-01T09:00:00', save: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, id_equipo_local: 73, id_equipo_visitante: 6, id_lugar: 2, plantilla: null, lugar: null, equipoLocal: null, equipoVisitante: null };
    Partido.findByPk.mockResolvedValueOnce(partido).mockResolvedValueOnce(actualizado);
    Partido.count.mockResolvedValue(0);
    Plantilla.findOne.mockResolvedValue({ id: 1, categoria: { id: 1, tiempopartido: 90 } });
    Partido.findAll.mockResolvedValue([]);
    const { promesa, res } = llamar(ctrl.actualizar, {
      params: { id: '1' },
      body: { fecha: '2026-01-05T10:00:00' }
    });

    await promesa;

    expect(partido.fecha).toBe('2026-01-05T10:00:00');
    expect(res._status).toBe(200);
  });

  it('eliminar elimina y responde 204', async () => {
    Partido.destroy.mockResolvedValue(1);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '1' } });

    await promesa;

    expect(Partido.destroy).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(res._status).toBe(204);
  });

  it('eliminar devuelve 404 si no encuentra nada', async () => {
    Partido.destroy.mockResolvedValue(0);
    const { promesa, res } = llamar(ctrl.eliminar, { params: { id: '99' } });

    await promesa;

    expect(res._status).toBe(404);
  });

  describe('importarActa', () => {
    const HTML_ACTA = `
      <html><body>
      <div class="dashboard-stat"><div class="details">
        <div class="number">Goles</div>
        <div class="desc"><table class="table"><tbody>
          <tr><td><i class="fa-solid fa-futbol" style="color: #0fa020;"></i></td>
              <td><span class="font-blue">(10')</span> PEREZ GOMEZ, JUAN </td></tr>
        </tbody></table></div>
      </div></div>
      <div class="dashboard-stat"><div class="details">
        <div class="number">PALMA DEL RIO ATLETICO C.F. </div>
        <div class="desc">
          <h5><strong>Titulares</strong></h5>
          <table class="table"><tbody>
            <tr><td>7</td><td><img class="fotojug"></td><td>PEREZ GOMEZ, JUAN</td></tr>
            <tr><td>4</td><td><img class="fotojug"></td><td>SIN FICHA, RIVAL</td></tr>
          </tbody></table>
          <h5><strong>Suplentes</strong></h5>
          <table class="table"><tbody></tbody></table>
          <h4>Tarjetas</h4>
          <table class="table"><tbody>
            <tr><td><img src="tarj_amar.gif"></td><td><span class="font-blue">(35')</span> PEREZ GOMEZ, JUAN </td></tr>
          </tbody></table>
        </div>
      </div></div>
      </body></html>
    `;

    function mockFetchOk(html = HTML_ACTA) {
      global.fetch = vi.fn()
        .mockResolvedValueOnce(new Response('', { status: 200 }))
        .mockResolvedValueOnce(new Response(html, { status: 200 }));
    }

    beforeEach(() => {
      Jugador.findAll.mockReset();
      PlantillaJugador.findAll.mockReset();
      PartidoJugador.findOrCreate.mockReset();
    });

    it('devuelve 404 si el partido no existe', async () => {
      Partido.findByPk.mockResolvedValue(null);
      const { promesa, res } = llamar(ctrl.importarActa, { params: { id: '99' } });
      await promesa;
      expect(res._status).toBe(404);
    });

    it('exige codigo_acta y codigo_primaria', async () => {
      Partido.findByPk.mockResolvedValue({ id: 1, codigo_acta: null, codigo_primaria: null, changed: () => false });
      const { promesa, res } = llamar(ctrl.importarActa, { params: { id: '1' }, body: {} });
      await promesa;
      expect(res._status).toBe(400);
    });

    it('actualiza a los jugadores que encuentra por nombre y reporta a los que no', async () => {
      mockFetchOk();
      const partido = {
        id: 1, id_plantilla: 5, id_equipo_local: 73, id_equipo_visitante: 50,
        codigo_acta: '2667398', codigo_primaria: '1000120',
        changed: () => false, save: vi.fn()
      };
      Partido.findByPk.mockResolvedValue(partido);
      PlantillaJugador.findAll.mockResolvedValue([{ id_jugador: 900 }]);
      Jugador.findAll.mockResolvedValue([{ id: 900, nombre: 'Juan', apellidos: 'Perez Gomez' }]);
      const fila = { tarjeta_amarilla: 0, tarjeta_roja: 0, goles: 0, save: vi.fn() };
      PartidoJugador.findOrCreate.mockResolvedValue([fila, true]);

      const { promesa, res } = llamar(ctrl.importarActa, { params: { id: '1' }, body: {} });
      await promesa;

      expect(PartidoJugador.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({
        where: { id_partido: 1, id_jugador: 900, es_local: true }
      }));
      expect(fila.goles).toBe(1);
      expect(fila.tarjeta_amarilla).toBe(1);
      expect(fila.save).toHaveBeenCalled();
      expect(res._json.actualizados).toEqual(['Juan Perez Gomez']);
      expect(res._json.noEncontrados).toEqual(['SIN FICHA, RIVAL']);
    });

    it('marca es_local=false si el PALMA es el equipo visitante', async () => {
      mockFetchOk();
      const partido = {
        id: 2, id_plantilla: 5, id_equipo_local: 50, id_equipo_visitante: 73,
        codigo_acta: '2667398', codigo_primaria: '1000120',
        changed: () => false, save: vi.fn()
      };
      Partido.findByPk.mockResolvedValue(partido);
      PlantillaJugador.findAll.mockResolvedValue([{ id_jugador: 900 }]);
      Jugador.findAll.mockResolvedValue([{ id: 900, nombre: 'Juan', apellidos: 'Perez Gomez' }]);
      const fila = { tarjeta_amarilla: 0, tarjeta_roja: 0, goles: 0, save: vi.fn() };
      PartidoJugador.findOrCreate.mockResolvedValue([fila, true]);

      const { promesa } = llamar(ctrl.importarActa, { params: { id: '2' }, body: {} });
      await promesa;

      expect(PartidoJugador.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({
        where: { id_partido: 2, id_jugador: 900, es_local: false }
      }));
    });

    it('usa el HTML enviado en el body en vez de descargarlo si se aporta', async () => {
      global.fetch = vi.fn(); // no debe llamarse
      const partido = {
        id: 1, id_plantilla: 5, id_equipo_local: 73, id_equipo_visitante: 50,
        codigo_acta: null, codigo_primaria: null, changed: () => false, save: vi.fn()
      };
      Partido.findByPk.mockResolvedValue(partido);
      PlantillaJugador.findAll.mockResolvedValue([{ id_jugador: 900 }]);
      Jugador.findAll.mockResolvedValue([{ id: 900, nombre: 'Juan', apellidos: 'Perez Gomez' }]);
      const fila = { tarjeta_amarilla: 0, tarjeta_roja: 0, goles: 0, save: vi.fn() };
      PartidoJugador.findOrCreate.mockResolvedValue([fila, true]);

      const { promesa, res } = llamar(ctrl.importarActa, { params: { id: '1' }, body: { html: HTML_ACTA } });
      await promesa;

      expect(global.fetch).not.toHaveBeenCalled();
      expect(res._json.actualizados).toEqual(['Juan Perez Gomez']);
    });

    it('devuelve 502 si RFAF pide login', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce(new Response('', { status: 200 }))
        .mockResolvedValueOnce(new Response('', { status: 302, headers: { Location: '/pnfg/NLogin' } }));
      const partido = { id: 1, id_plantilla: 5, codigo_acta: '1', codigo_primaria: '1', changed: () => false, save: vi.fn() };
      Partido.findByPk.mockResolvedValue(partido);

      const { promesa, res } = llamar(ctrl.importarActa, { params: { id: '1' }, body: {} });
      await promesa;

      expect(res._status).toBe(502);
    });
  });
});
