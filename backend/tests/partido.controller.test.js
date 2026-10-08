import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Op } from 'sequelize';
import { Partido, Plantilla, Categoria, Entrenamiento, Torneo, Jornada, PartidoJugador, PartidoTarjeta, PartidoGol, Jugador, PlantillaJugador, Sancion } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/partido.controller.js';
import { createRequire } from 'node:module';

// Misma instancia CommonJS que usa el controlador, para poder espiar leerActa.
const rfafActa = createRequire(import.meta.url)('../src/utils/rfafActa.js');

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
      observaciones: null,
      jornada: null,
      resultado: null,
      suspendido: 0,
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

  it('obtener devuelve de cada jugador los datos del acta (titular, cambios y minutos)', async () => {
    Partido.findByPk.mockResolvedValue({ id: 1, toJSON: () => ({ id: 1 }) });
    const { promesa } = llamar(ctrl.obtener, { params: { id: '1' } });
    await promesa;
    const include = Partido.findByPk.mock.calls[0][1].include.find((i) => i.as === 'partidoJugadores');
    expect(include.attributes).toEqual(expect.arrayContaining(['titular', 'minuto_entrada', 'minuto_salida', 'minutos']));
  });

  it('actualizar guarda y vacía las observaciones', async () => {
    const partido = { id: 1, id_equipo_local: 73, id_equipo_visitante: 6, observaciones: null, save: vi.fn().mockResolvedValue() };
    Partido.findByPk.mockResolvedValueOnce(partido).mockResolvedValueOnce({ id: 1 });
    const { promesa } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { observaciones: 'Llevar balones' } });
    await promesa;
    expect(partido.observaciones).toBe('Llevar balones');

    Partido.findByPk.mockResolvedValueOnce(partido).mockResolvedValueOnce({ id: 1 });
    const otra = llamar(ctrl.actualizar, { params: { id: '1' }, body: { observaciones: '' } });
    await otra.promesa;
    expect(partido.observaciones).toBeNull();
  });

  it('actualizar conserva los datos del acta (titular, cambios, minutos) si el formulario no los envía', async () => {
    const partido = { id: 1, id_equipo_local: 73, id_equipo_visitante: 6, save: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, plantilla: null, lugar: null, equipoLocal: null, equipoVisitante: null };
    Partido.findByPk.mockResolvedValueOnce(partido).mockResolvedValueOnce(actualizado);
    Sancion.findOne.mockResolvedValue(null);
    PartidoJugador.findAll.mockResolvedValueOnce([
      { id_jugador: 9, id_equipo_jugador: null, es_local: true, titular: true, minuto_entrada: null, minuto_salida: 56, minutos: 56 },
      { id_jugador: 10, id_equipo_jugador: null, es_local: true, titular: false, minuto_entrada: 56, minuto_salida: null, minutos: 34 }
    ]);

    const { promesa } = llamar(ctrl.actualizar, {
      params: { id: '1' },
      body: {
        jugadores_local: [
          { id_jugador: 9, goles: 1 },                  // formulario antiguo: sin datos del acta
          { id_jugador: 10, minutos: 40 },              // el formulario corrige los minutos
          { id_jugador: 11 }                            // jugador nuevo: sin datos
        ],
        jugadores_visitante: []
      }
    });
    await promesa;

    const filas = PartidoJugador.bulkCreate.mock.calls.at(-1)[0];
    expect(filas.find((f) => f.id_jugador === 9)).toMatchObject({ goles: 1, titular: true, minuto_salida: 56, minutos: 56 });
    expect(filas.find((f) => f.id_jugador === 10)).toMatchObject({ titular: false, minuto_entrada: 56, minutos: 40 });
    expect(filas.find((f) => f.id_jugador === 11)).toMatchObject({ titular: null, minuto_entrada: null, minuto_salida: null, minutos: null });
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

  it('crear guarda suspendido cuando se indica', async () => {
    Partido.count.mockResolvedValue(0);
    Partido.findAll.mockResolvedValue([]);
    const creado = { id: 5, id_equipo_local: 6, id_equipo_visitante: 7 };
    const completo = { id: 5, plantilla: null, lugar: null, equipoLocal: null, equipoVisitante: null };
    Partido.create.mockResolvedValue(creado);
    Partido.findByPk.mockResolvedValue(completo);
    const { promesa } = llamar(ctrl.crear, {
      user: { id: 7 },
      body: { id_plantilla: 1, fecha: '2026-01-01T10:00:00', id_equipo_local: 6, id_equipo_visitante: 7, suspendido: true }
    });

    await promesa;

    expect(Partido.create).toHaveBeenCalledWith(
      expect.objectContaining({ suspendido: 1 })
    );
  });

  it('actualizar guarda suspendido cuando se indica', async () => {
    const partido = { id: 1, id_equipo_local: 5, id_equipo_visitante: 6, save: vi.fn().mockResolvedValue() };
    const actualizado = { id: 1, plantilla: null, lugar: null, equipoLocal: null, equipoVisitante: null };
    Partido.findByPk.mockResolvedValueOnce(partido).mockResolvedValueOnce(actualizado);
    const { promesa } = llamar(ctrl.actualizar, { params: { id: '1' }, body: { suspendido: true } });

    await promesa;

    expect(partido.suspendido).toBe(1);
    expect(partido.save).toHaveBeenCalled();
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

  describe('finalizarActa', () => {
    const ACTA = {
      resultado: '2-1',
      local: {
        nombre: 'PALMA DEL RIO ATLETICO C.F.',
        goles: 2,
        jugadores: [
          // Pérez sale en el 70 y entra el 4 en su lugar.
          { dorsal: 7, nombre: 'PEREZ GOMEZ, JUAN', titular: true, goles: 2, tarjeta_amarilla: 1, tarjeta_roja: 0, minuto_entrada: null, minuto_salida: 70 },
          { dorsal: 4, nombre: 'SIN FICHA, ALGUIEN', titular: false, goles: 0, tarjeta_amarilla: 0, tarjeta_roja: 0, minuto_entrada: 70, minuto_salida: null }
        ]
      },
      visitante: {
        nombre: 'OTRO EQUIPO C.F.',
        goles: 1,
        jugadores: [{ dorsal: 9, nombre: 'GARCIA TORRES, MANUEL', titular: true, goles: 1, tarjeta_amarilla: 0, tarjeta_roja: 0, minuto_entrada: null, minuto_salida: null }]
      }
    };

    function partidoPalma(overrides = {}) {
      return {
        id: 1, id_plantilla: 5, id_equipo_local: 73, id_equipo_visitante: 50,
        codigo_acta: '2733994', codigo_primaria: '1000120', resultado: null,
        save: vi.fn(),
        ...overrides
      };
    }

    let leerActa;
    beforeEach(() => {
      Jugador.findAll.mockReset();
      PlantillaJugador.findAll.mockReset();
      PartidoJugador.bulkCreate.mockReset();
      Jugador.create.mockReset();
      PlantillaJugador.create.mockReset();
      Plantilla.findAll.mockReset();
      Sancion.destroy.mockReset();
      Sancion.create.mockReset();
      Sancion.findOne.mockReset();
      Sancion.findOne.mockResolvedValue(null);
      Plantilla.findOne.mockReset();
      Plantilla.findOne.mockResolvedValue({ id: 5, categoria: { id: 20, nombre: 'Senior A', tiempopartido: 90 } });
      leerActa = vi.spyOn(rfafActa, 'leerActa');
      leerActa.mockReset();
      leerActa.mockResolvedValue(ACTA);
      PlantillaJugador.findAll.mockResolvedValue([{ id_jugador: 900 }]);
      // 1ª llamada: jugadores de la plantilla; 2ª: todos los jugadores.
      Jugador.findAll.mockImplementation(async ({ where } = {}) => (where
        ? [{ id: 900, nombre: 'Juan', apellidos: 'Pérez Gómez' }]
        : [{ id: 900, nombre: 'Juan', apellidos: 'Pérez Gómez' }]));
      Jugador.create.mockImplementation(async (datos) => ({ id: 950, ...datos }));
    });

    it('devuelve 404 si el partido no existe', async () => {
      Partido.findByPk.mockResolvedValue(null);
      const { promesa, res } = llamar(ctrl.finalizarActa, { params: { id: '99' } });
      await promesa;
      expect(res._status).toBe(404);
    });

    it('exige codigo_acta y codigo_primaria sin llamar a RFAF', async () => {
      Partido.findByPk.mockResolvedValue(partidoPalma({ codigo_acta: null }));
      const { promesa, res } = llamar(ctrl.finalizarActa, { params: { id: '1' }, body: {} });
      await promesa;
      expect(res._status).toBe(400);
      expect(leerActa).not.toHaveBeenCalled();
    });

    it('lee el acta una vez, crea al jugador que no existe en la plantilla del partido y guarda', async () => {
      const partido = partidoPalma();
      Partido.findByPk.mockResolvedValue(partido);
      PlantillaJugador.create.mockResolvedValue({});

      const { promesa, res } = llamar(ctrl.finalizarActa, { params: { id: '1' }, body: {} });
      await promesa;

      expect(leerActa).toHaveBeenCalledTimes(1);
      expect(leerActa).toHaveBeenCalledWith('1000120', '2733994');
      expect(Jugador.create).toHaveBeenCalledWith({ nombre: 'Alguien', apellidos: 'Sin Ficha' });
      expect(PlantillaJugador.create).toHaveBeenCalledWith({ id_plantilla: 5, id_jugador: 950, dorsal: 4 });
      expect(PartidoJugador.destroy).toHaveBeenCalledWith({
        where: { id_partido: 1, es_local: true, id_jugador: { [Op.ne]: null } }
      });
      expect(PartidoJugador.bulkCreate).toHaveBeenCalledWith([
        { id_partido: 1, id_jugador: 900, es_local: true, tarjeta_amarilla: 1, tarjeta_roja: 0, goles: 2,
          titular: true, minuto_entrada: null, minuto_salida: 70, minutos: 70 },
        { id_partido: 1, id_jugador: 950, es_local: true, tarjeta_amarilla: 0, tarjeta_roja: 0, goles: 0,
          titular: false, minuto_entrada: 70, minuto_salida: null, minutos: 20 }
      ]);
      // Sanciones: se quitan las de jugadores que ya no están y se crea la
      // del que tiene amarilla; el que no tiene tarjetas no genera sanción.
      expect(Sancion.destroy).toHaveBeenCalledWith({
        where: { id_partido: 1, id_jugador: { [Op.notIn]: [900, 950] } }
      });
      expect(Sancion.create).toHaveBeenCalledTimes(1);
      expect(Sancion.create).toHaveBeenCalledWith({ id_partido: 1, id_jugador: 900, amarilla: 1, roja: 0 });
      expect(partido.resultado).toBe('2-1');
      expect(partido.acta_finalizada_at).toBeInstanceOf(Date);
      expect(partido.save).toHaveBeenCalled();
      expect(res._json).toEqual({
        resultado: '2-1',
        actualizados: ['Juan Pérez Gómez', 'Alguien Sin Ficha'],
        creados: ['Alguien Sin Ficha']
      });
    });

    it('no duplica a un jugador que existe en otra plantilla', async () => {
      Partido.findByPk.mockResolvedValue(partidoPalma());
      Jugador.findAll.mockImplementation(async ({ where } = {}) => (where
        ? [{ id: 900, nombre: 'Juan', apellidos: 'Pérez Gómez' }]
        : [{ id: 900, nombre: 'Juan', apellidos: 'Pérez Gómez' }, { id: 777, nombre: 'Alguien', apellidos: 'Sin Ficha' }]));

      const { promesa, res } = llamar(ctrl.finalizarActa, { params: { id: '1' }, body: {} });
      await promesa;

      expect(Jugador.create).not.toHaveBeenCalled();
      expect(PartidoJugador.bulkCreate.mock.calls[0][0].map((f) => f.id_jugador)).toEqual([900, 777]);
      expect(res._json.creados).toEqual([]);
    });

    it('usa los datos del equipo visitante si el PALMA juega fuera', async () => {
      Partido.findByPk.mockResolvedValue(partidoPalma({ id_equipo_local: 50, id_equipo_visitante: 73 }));
      Jugador.findAll.mockResolvedValue([{ id: 901, nombre: 'Manuel', apellidos: 'Garcia Torres' }]);

      const { promesa } = llamar(ctrl.finalizarActa, { params: { id: '1' }, body: {} });
      await promesa;

      expect(PartidoJugador.bulkCreate).toHaveBeenCalledWith([
        { id_partido: 1, id_jugador: 901, es_local: false, tarjeta_amarilla: 0, tarjeta_roja: 0, goles: 1,
          titular: true, minuto_entrada: null, minuto_salida: null, minutos: 90 }
      ]);
    });

    it('calcula los minutos sobre 90 aunque la categoría tenga otro tiempo de partido', async () => {
      Partido.findByPk.mockResolvedValue(partidoPalma());
      Plantilla.findOne.mockResolvedValue({ id: 5, categoria: { id: 20, nombre: 'Senior A', tiempopartido: 120 } });
      PlantillaJugador.findAll.mockResolvedValue([{ id_jugador: 1 }, { id_jugador: 2 }, { id_jugador: 3 }, { id_jugador: 4 }]);
      Jugador.findAll.mockResolvedValue([
        { id: 1, nombre: 'Uno', apellidos: 'Titular' },
        { id: 2, nombre: 'Dos', apellidos: 'Sale' },
        { id: 3, nombre: 'Tres', apellidos: 'Entra Y Sale' },
        { id: 4, nombre: 'Cuatro', apellidos: 'Banquillo' }
      ]);
      const j = (nombre, titular, minuto_entrada, minuto_salida) => ({
        dorsal: null, nombre, titular, goles: 0, tarjeta_amarilla: 0, tarjeta_roja: 0, minuto_entrada, minuto_salida
      });
      leerActa.mockResolvedValue({
        ...ACTA,
        local: { ...ACTA.local, jugadores: [
          j('TITULAR, UNO', true, null, null),
          j('SALE, DOS', true, null, 30),
          j('ENTRA Y SALE, TRES', false, 30, 50),
          j('BANQUILLO, CUATRO', false, null, null)
        ] }
      });

      const { promesa } = llamar(ctrl.finalizarActa, { params: { id: '1' }, body: {} });
      await promesa;

      const minutos = Object.fromEntries(PartidoJugador.bulkCreate.mock.calls[0][0].map((f) => [f.id_jugador, f.minutos]));
      expect(minutos).toEqual({ 1: 90, 2: 30, 3: 20, 4: 0 });
    });

    it('guarda las tarjetas del PALMA con su minuto y el marcador justo antes', async () => {
      Partido.findByPk.mockResolvedValue(partidoPalma());
      PartidoTarjeta.destroy.mockReset();
      PartidoTarjeta.bulkCreate.mockReset();
      leerActa.mockResolvedValue({
        ...ACTA,
        local: { ...ACTA.local, tarjetas: [{ nombre: 'PEREZ GOMEZ, JUAN', tipo: 'amarilla', minuto: 50 }, { nombre: 'OTRO, CUERPO TECNICO', tipo: 'amarilla', minuto: 60 }] },
        goles: [{ minuto: 10, equipo: 'local' }, { minuto: 30, equipo: 'visitante' }, { minuto: 40, equipo: 'local' }, { minuto: 50, equipo: 'visitante' }]
      });

      const { promesa } = llamar(ctrl.finalizarActa, { params: { id: '1' }, body: {} });
      await promesa;

      expect(PartidoTarjeta.destroy).toHaveBeenCalledWith({ where: { id_partido: 1 } });
      // Al minuto 50 iba 2-1 (el gol del mismo minuto no cuenta); la del cuerpo técnico no se guarda.
      expect(PartidoTarjeta.bulkCreate).toHaveBeenCalledWith([
        { id_partido: 1, id_jugador: 900, tipo: 'amarilla', minuto: 50, goles_favor: 2, goles_contra: 1 }
      ]);
    });

    it('guarda los goles del PALMA con su minuto, sin los de propia puerta', async () => {
      Partido.findByPk.mockResolvedValue(partidoPalma());
      PartidoGol.destroy.mockReset();
      PartidoGol.bulkCreate.mockReset();
      leerActa.mockResolvedValue({
        ...ACTA,
        goles: [
          { minuto: 10, equipo: 'local', nombre: 'PEREZ GOMEZ, JUAN', tipo: 'normal' },
          { minuto: 30, equipo: 'visitante', nombre: 'GARCIA TORRES, MANUEL', tipo: 'normal' }, // del rival
          { minuto: 40, equipo: 'local', nombre: 'GARCIA TORRES, MANUEL', tipo: 'propia' },     // en propia del rival
          { minuto: 60, equipo: 'local', nombre: 'PEREZ GOMEZ, JUAN', tipo: 'penalti' }
        ]
      });

      const { promesa } = llamar(ctrl.finalizarActa, { params: { id: '1' }, body: {} });
      await promesa;

      expect(PartidoGol.destroy).toHaveBeenCalledWith({ where: { id_partido: 1 } });
      expect(PartidoGol.bulkCreate).toHaveBeenCalledWith([
        { id_partido: 1, id_jugador: 900, minuto: 10, tipo: 'normal' },
        { id_partido: 1, id_jugador: 900, minuto: 60, tipo: 'penalti' }
      ]);
    });

    it('en Fútbol 7 no guarda titulares, cambios ni minutos', async () => {
      Partido.findByPk.mockResolvedValue(partidoPalma());
      Plantilla.findOne.mockResolvedValue({ id: 5, categoria: { id: 13, nombre: 'Alevin C', id_tipofutbol: 1 } });

      const { promesa } = llamar(ctrl.finalizarActa, { params: { id: '1' }, body: {} });
      await promesa;

      for (const fila of PartidoJugador.bulkCreate.mock.calls[0][0]) {
        expect(fila).toMatchObject({ titular: null, minuto_entrada: null, minuto_salida: null, minutos: null });
      }
      // Los goles y tarjetas sí se guardan.
      expect(PartidoJugador.bulkCreate.mock.calls[0][0][0]).toMatchObject({ goles: 2, tarjeta_amarilla: 1 });
    });

    it('fuera del Senior A no calcula los minutos (pero sí titulares y cambios)', async () => {
      Partido.findByPk.mockResolvedValue(partidoPalma());
      Plantilla.findOne.mockResolvedValue({ id: 5, categoria: { id: 13, nombre: 'Alevin A', tiempopartido: 60, id_tipofutbol: 2 } });

      const { promesa } = llamar(ctrl.finalizarActa, { params: { id: '1' }, body: {} });
      await promesa;

      const [perez] = PartidoJugador.bulkCreate.mock.calls[0][0];
      expect(perez).toMatchObject({ titular: true, minuto_salida: 70, minutos: null });
    });

    it('actualiza la sanción existente de un jugador con roja', async () => {
      Partido.findByPk.mockResolvedValue(partidoPalma());
      const conRoja = {
        ...ACTA,
        local: { ...ACTA.local, jugadores: [{ dorsal: 7, nombre: 'PEREZ GOMEZ, JUAN', titular: true, goles: 0, tarjeta_amarilla: 2, tarjeta_roja: 1 }] }
      };
      leerActa.mockResolvedValue(conRoja);
      const existente = { amarilla: 1, roja: 0, save: vi.fn(), destroy: vi.fn() };
      Sancion.findOne.mockResolvedValue(existente);

      const { promesa } = llamar(ctrl.finalizarActa, { params: { id: '1' }, body: {} });
      await promesa;

      expect(existente).toMatchObject({ amarilla: 2, roja: 1 });
      expect(existente.save).toHaveBeenCalled();
      expect(Sancion.create).not.toHaveBeenCalled();
    });

    it('si RFAF falla no toca el partido', async () => {
      const partido = partidoPalma();
      Partido.findByPk.mockResolvedValue(partido);
      leerActa.mockRejectedValue(new rfafActa.ErrorActa('RFAF respondió 500 al pedir el acta.', 502));

      const { promesa, res } = llamar(ctrl.finalizarActa, { params: { id: '1' }, body: {} });
      await promesa;

      expect(res._status).toBe(502);
      expect(PartidoJugador.destroy).not.toHaveBeenCalled();
      expect(partido.save).not.toHaveBeenCalled();
      expect(partido.acta_finalizada_at).toBeUndefined();
    });
  });
});
