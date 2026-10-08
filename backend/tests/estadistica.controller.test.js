import { describe, it, expect, beforeEach } from 'vitest';
import { Partido, PartidoJugador, PartidoTarjeta, PartidoGol } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/estadistica.controller.js';

describe('Sección Estadísticas · estadistica.controller', () => {
  beforeEach(() => {
    Partido.findAll.mockReset();
    PartidoJugador.findAll.mockReset();
    PartidoTarjeta.findAll.mockReset();
    PartidoTarjeta.findAll.mockResolvedValue([]);
    PartidoGol.findAll.mockReset();
    PartidoGol.findAll.mockResolvedValue([]);
  });

  function llamar(overrides = {}) {
    const { req, res, next } = mockReqRes(overrides);
    return { promesa: ctrl.listar(req, res, next), res };
  }

  it('exige la plantilla', async () => {
    const { promesa, res } = llamar({ query: {} });
    await promesa;
    expect(res._status).toBe(400);
  });

  it('suma partidos jugados y minutos por jugador, de más a menos minutos', async () => {
    Partido.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const ana = { id: 7, nombre: 'Ana', apellidos: 'López' };
    const luis = { id: 8, nombre: 'Luis', apellidos: 'Ruiz' };
    PartidoJugador.findAll.mockResolvedValue([
      // Partido 1: el PALMA juega en casa; partido 2: fuera.
      { id_partido: 1, id_jugador: 7, es_local: true, titular: true, minuto_entrada: null, minutos: 90, goles: 2, tarjeta_amarilla: 1, tarjeta_roja: 0, jugador: ana },
      { id_partido: 2, id_jugador: 7, es_local: false, titular: false, minuto_entrada: 56, minutos: 34, goles: 1, tarjeta_amarilla: 0, tarjeta_roja: 1, jugador: ana },
      { id_partido: 1, id_jugador: 8, es_local: true, titular: 1, minuto_entrada: null, minutos: 90, goles: 0, tarjeta_amarilla: 0, tarjeta_roja: 0, jugador: luis },
      { id_partido: 2, id_jugador: 8, es_local: false, titular: 0, minuto_entrada: null, minutos: 0, goles: 0, tarjeta_amarilla: 0, tarjeta_roja: 0, jugador: luis },     // no jugó: no cuenta el partido
      { id_partido: 2, id_jugador: 9, es_local: false, minutos: 0, jugador: { id: 9, nombre: 'Sin', apellidos: 'Jugar' } },
      { id_partido: 1, id_jugador: null, id_equipo_jugador: 3, es_local: false, minutos: null } // rival
    ]);
    PartidoGol.findAll.mockResolvedValue([
      { id_partido: 1, id_jugador: 7, minuto: 12 },
      { id_partido: 1, id_jugador: 7, minuto: 45 }, // el 45 aún es 1ª parte
      { id_partido: 2, id_jugador: 7, minuto: 70 },
      { id_partido: 2, id_jugador: 7, minuto: null } // sin minuto: no cuenta por partes
    ]);

    const { promesa, res } = llamar({ query: { id_plantilla: '5' } });
    await promesa;

    expect(Partido.findAll).toHaveBeenCalledWith({ where: { id_plantilla: 5 }, attributes: ['id'] });
    expect(res._json).toEqual([
      { id_jugador: 7, nombre: 'Ana', apellidos: 'López', partidos: 2, titular: 1, suplente: 1, minutos: 124, minutos_local: 90, minutos_visitante: 34,
        goles: 3, tarjetas_amarillas: 1, tarjetas_rojas: 1,
        minutos_titular: 90, minutos_banquillo: 34, goles_banquillo: 1, banquillo_no_jugados: 0,
        goles_local: 2, goles_visitante: 1, goles_titular: 2, goles_primera: 2, goles_segunda: 1,
        amarillas_primera: 0, amarillas_segunda: 0, amarillas_ganando: 0, amarillas_perdiendo: 0,
        rojas_primera: 0, rojas_segunda: 0, rojas_ganando: 0, rojas_perdiendo: 0,
        porcentaje_goles_partido: 150, porcentaje_goles_banquillo: 33.3,
        porcentaje_minutos_local: 72.6, porcentaje_minutos_visitante: 27.4,
        porcentaje_goles_local: 66.7, porcentaje_goles_visitante: 33.3 },
      { id_jugador: 8, nombre: 'Luis', apellidos: 'Ruiz', partidos: 1, titular: 1, suplente: 0, minutos: 90, minutos_local: 90, minutos_visitante: 0,
        goles: 0, tarjetas_amarillas: 0, tarjetas_rojas: 0,
        minutos_titular: 90, minutos_banquillo: 0, goles_banquillo: 0, banquillo_no_jugados: 1,
        goles_local: 0, goles_visitante: 0, goles_titular: 0, goles_primera: 0, goles_segunda: 0,
        amarillas_primera: 0, amarillas_segunda: 0, amarillas_ganando: 0, amarillas_perdiendo: 0,
        rojas_primera: 0, rojas_segunda: 0, rojas_ganando: 0, rojas_perdiendo: 0,
        porcentaje_goles_partido: 0, porcentaje_goles_banquillo: null,
        porcentaje_minutos_local: 100, porcentaje_minutos_visitante: 0,
        porcentaje_goles_local: null, porcentaje_goles_visitante: null }
    ]);
  });

  it('sin partidos devuelve una lista vacía', async () => {
    Partido.findAll.mockResolvedValue([]);
    const { promesa, res } = llamar({ query: { id_plantilla: '5' } });
    await promesa;
    expect(res._json).toEqual([]);
    expect(PartidoJugador.findAll).not.toHaveBeenCalled();
  });

  it('reparte las tarjetas por parte y según el marcador', async () => {
    Partido.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    PartidoJugador.findAll.mockResolvedValue([
      { id_partido: 1, id_jugador: 7, es_local: true, titular: true, minutos: 90, goles: 0, tarjeta_amarilla: 2, tarjeta_roja: 1, jugador: { nombre: 'Ana', apellidos: 'López' } },
      { id_partido: 2, id_jugador: 7, es_local: false, titular: true, minutos: 90, goles: 0, tarjeta_amarilla: 1, tarjeta_roja: 0, jugador: { nombre: 'Ana', apellidos: 'López' } }
    ]);
    PartidoTarjeta.findAll.mockResolvedValue([
      { id_jugador: 7, tipo: 'amarilla', minuto: 20, goles_favor: 1, goles_contra: 0 }, // 1ª parte, ganando
      { id_jugador: 7, tipo: 'amarilla', minuto: 45, goles_favor: 0, goles_contra: 0 }, // 1ª parte, empate
      { id_jugador: 7, tipo: 'roja', minuto: 80, goles_favor: 0, goles_contra: 2 },     // 2ª parte, perdiendo
      { id_jugador: 7, tipo: 'amarilla', minuto: 46, goles_favor: 0, goles_contra: 1 }  // 2ª parte, perdiendo
    ]);

    const { promesa, res } = llamar({ query: { id_plantilla: '5' } });
    await promesa;

    expect(res._json[0]).toMatchObject({
      tarjetas_amarillas: 3, tarjetas_rojas: 1,
      amarillas_primera: 2, amarillas_segunda: 1, amarillas_ganando: 1, amarillas_perdiendo: 1,
      rojas_primera: 0, rojas_segunda: 1, rojas_ganando: 0, rojas_perdiendo: 1
    });
  });
});
