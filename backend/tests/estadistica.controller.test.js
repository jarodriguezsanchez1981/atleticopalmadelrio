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
    expect(res._json.map((f) => f.id_jugador)).toEqual([7, 8]);
    const [anaFila, luisFila] = res._json;
    expect(anaFila).toMatchObject({
      nombre: 'Ana', apellidos: 'López',
      convocatorias: 2, partidos: 2, titular: 1, suplente: 1, banquillo_no_jugados: 0,
      minutos: 124, minutos_titular: 90, minutos_banquillo: 34,
      goles: 3, goles_titular: 2, goles_banquillo: 1, goles_primera: 2, goles_segunda: 1,
      tarjetas_amarillas: 1, tarjetas_rojas: 1,
      porcentaje_goles_partido: 150, porcentaje_goles_banquillo: 33.3,
      // 124' de 180' posibles: 90' de 90' en casa y 34' de 90' fuera.
      porcentaje_minutos: 68.9, porcentaje_minutos_local: 100, porcentaje_minutos_visitante: 37.8,
      porcentaje_goles_local: 66.7, porcentaje_goles_visitante: 33.3,
      // En casa (partido 1): titular, 90', 2 goles en la 1ª parte, amarilla.
      convocatorias_local: 1, partidos_local: 1, titular_local: 1, suplente_local: 0, minutos_local: 90,
      minutos_titular_local: 90, goles_local: 2, goles_titular_local: 2, goles_primera_local: 2, goles_segunda_local: 0,
      tarjetas_amarillas_local: 1, tarjetas_rojas_local: 0, porcentaje_goles_partido_local: 200,
      // Fuera (partido 2): entra en el 56, 34', 1 gol en la 2ª parte, roja.
      convocatorias_visitante: 1, partidos_visitante: 1, titular_visitante: 0, suplente_visitante: 1, minutos_visitante: 34,
      minutos_banquillo_visitante: 34, goles_visitante: 1, goles_banquillo_visitante: 1, goles_primera_visitante: 0,
      goles_segunda_visitante: 1, tarjetas_amarillas_visitante: 0, tarjetas_rojas_visitante: 1,
      porcentaje_goles_partido_visitante: 100, porcentaje_goles_banquillo_visitante: 100
    });
    expect(luisFila).toMatchObject({
      convocatorias: 2, partidos: 1, titular: 1, banquillo_no_jugados: 1, minutos: 90, goles: 0,
      porcentaje_goles_partido: 0, porcentaje_goles_banquillo: null,
      // Fuera no jugó ningún partido: sin porcentaje.
      porcentaje_minutos: 100, porcentaje_minutos_local: 100, porcentaje_minutos_visitante: null,
      porcentaje_goles_local: null, porcentaje_goles_visitante: null,
      banquillo_no_jugados_local: 0, banquillo_no_jugados_visitante: 1,
      partidos_visitante: 0, porcentaje_goles_partido_visitante: null
    });
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
      { id_partido: 1, id_jugador: 7, tipo: 'amarilla', minuto: 20, goles_favor: 1, goles_contra: 0 }, // 1ª parte, ganando
      { id_partido: 1, id_jugador: 7, tipo: 'amarilla', minuto: 45, goles_favor: 0, goles_contra: 0 }, // 1ª parte, empate
      { id_partido: 1, id_jugador: 7, tipo: 'roja', minuto: 80, goles_favor: 0, goles_contra: 2 },     // 2ª parte, perdiendo
      { id_partido: 2, id_jugador: 7, tipo: 'amarilla', minuto: 46, goles_favor: 0, goles_contra: 1 }  // 2ª parte, perdiendo
    ]);

    const { promesa, res } = llamar({ query: { id_plantilla: '5' } });
    await promesa;

    expect(res._json[0]).toMatchObject({
      tarjetas_amarillas: 3, tarjetas_rojas: 1,
      amarillas_primera: 2, amarillas_segunda: 1, amarillas_ganando: 1, amarillas_perdiendo: 1,
      rojas_primera: 0, rojas_segunda: 1, rojas_ganando: 0, rojas_perdiendo: 1,
      // Tres en casa (partido 1) y una fuera (partido 2).
      amarillas_primera_local: 2, amarillas_ganando_local: 1, rojas_segunda_local: 1, rojas_perdiendo_local: 1,
      amarillas_segunda_visitante: 1, amarillas_perdiendo_visitante: 1, amarillas_primera_visitante: 0
    });
  });
});
