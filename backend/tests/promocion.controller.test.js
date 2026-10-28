import { describe, it, expect, beforeEach } from 'vitest';
import { Promocion, Plantilla, Categoria, Jugador, PartidoJugador } from './helpers/models.js';
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

  describe('resumen', () => {
    // Jugador 9 de la plantilla 2 (Alevín B, grupo 4), temporada 1.
    const promocion = {
      id: 1, id_plantilla: 2, id_categoria: 13, id_jugador: 9,
      plantilla: { id: 2, id_temporada: 1, categoria: { id: 12, nombre: 'Alevin B', grupo: 4 } }
    };
    const jugado = (idPartido, idPlantilla, grupo, idTemporada = 1) => ({
      id_partido: idPartido, id_jugador: 9,
      partido: { id: idPartido, id_plantilla: idPlantilla, plantilla: { id: idPlantilla, id_temporada: idTemporada, categoria: { grupo } } }
    });

    beforeEach(() => PartidoJugador.findAll.mockReset());

    it('cuenta como RFAF los partidos de su mismo grupo y como Categoría los de otro grupo', async () => {
      Promocion.findAll.mockResolvedValue([promocion]);
      PartidoJugador.findAll.mockResolvedValue([
        jugado(100, 2, 4),        // su propia plantilla: no cuenta
        jugado(101, 3, 4),        // Alevín A: mismo grupo
        jugado(102, 3, '4'),      // mismo grupo aunque llegue como texto
        jugado(102, 3, 4),        // repetido: un partido cuenta una vez
        jugado(103, 5, 5),        // Infantil: otro grupo
        jugado(104, 6, null),     // sin grupo: cuenta como Categoría
        jugado(105, 3, 4, 2)      // otra temporada: no cuenta
      ]);

      const { promesa, res } = llamar(ctrl.resumen);
      await promesa;

      expect(res._json).toHaveLength(1);
      expect(res._json[0]).toMatchObject({ id: 1, id_jugador: 9, promocion_rfaf: 2, promocion_categoria: 2 });
    });

    it('devuelve los partidos jugados en la promoción por orden de fecha, con el rival y lo que hizo el jugador', async () => {
      Promocion.findAll.mockResolvedValue([promocion]);
      const partido = (id, fecha, extra = {}) => ({
        id_partido: id, id_jugador: 9, goles: 0, tarjeta_amarilla: 0, tarjeta_roja: 0, minutos: null,
        partido: {
          id, id_plantilla: 3, fecha, jornada: id - 200, id_equipo_local: 73, id_equipo_visitante: 50, resultado: '2-1', suspendido: false,
          plantilla: { id: 3, id_temporada: 1, categoria: { nombre: 'Alevin A', grupo: 4 } },
          equipoLocal: { nombre: 'PALMA' }, equipoVisitante: { nombre: 'RIVAL B' },
          ...extra
        }
      });
      PartidoJugador.findAll.mockResolvedValue([
        { ...partido(202, '2026-10-10'), goles: 2, tarjeta_amarilla: 1 },
        partido(201, '2026-09-20', {
          id_equipo_local: 50, id_equipo_visitante: 73, equipoLocal: { nombre: 'RIVAL A' },
          plantilla: { id: 5, id_temporada: 1, categoria: { nombre: 'Infantil C', grupo: 5 } }
        })
      ]);

      const { promesa, res } = llamar(ctrl.resumen);
      await promesa;

      expect(res._json[0].partidos).toEqual([
        { id_partido: 201, fecha: '2026-09-20', jornada: 1, categoria: 'Infantil C', rival: 'RIVAL A', es_local: false, resultado: '2-1',
          suspendido: false, tipo: 'categoria', goles: 0, tarjeta_amarilla: 0, tarjeta_roja: 0, minutos: null },
        { id_partido: 202, fecha: '2026-10-10', jornada: 2, categoria: 'Alevin A', rival: 'RIVAL B', es_local: true, resultado: '2-1',
          suspendido: false, tipo: 'rfaf', goles: 2, tarjeta_amarilla: 1, tarjeta_roja: 0, minutos: null }
      ]);
    });

    it('sin promociones no consulta partidos', async () => {
      Promocion.findAll.mockResolvedValue([]);
      const { promesa, res } = llamar(ctrl.resumen);
      await promesa;
      expect(res._json).toEqual([]);
      expect(PartidoJugador.findAll).not.toHaveBeenCalled();
    });
  });
});
