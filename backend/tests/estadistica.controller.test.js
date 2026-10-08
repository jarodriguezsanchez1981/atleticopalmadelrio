import { describe, it, expect, beforeEach } from 'vitest';
import { Partido, PartidoJugador } from './helpers/models.js';
import { mockReqRes } from './helpers/http.js';

import * as ctrl from '../src/controllers/estadistica.controller.js';

describe('Sección Estadísticas · estadistica.controller', () => {
  beforeEach(() => {
    Partido.findAll.mockReset();
    PartidoJugador.findAll.mockReset();
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

    const { promesa, res } = llamar({ query: { id_plantilla: '5' } });
    await promesa;

    expect(Partido.findAll).toHaveBeenCalledWith({ where: { id_plantilla: 5 }, attributes: ['id'] });
    expect(res._json).toEqual([
      { id_jugador: 7, nombre: 'Ana', apellidos: 'López', partidos: 2, titular: 1, suplente: 1, minutos: 124, minutos_local: 90, minutos_visitante: 34,
        goles: 3, tarjetas_amarillas: 1, tarjetas_rojas: 1,
        minutos_titular: 90, minutos_banquillo: 34, goles_banquillo: 1, banquillo_no_jugados: 0,
        porcentaje_goles_partido: 150, porcentaje_goles_banquillo: 33.3 },
      { id_jugador: 8, nombre: 'Luis', apellidos: 'Ruiz', partidos: 1, titular: 1, suplente: 0, minutos: 90, minutos_local: 90, minutos_visitante: 0,
        goles: 0, tarjetas_amarillas: 0, tarjetas_rojas: 0,
        minutos_titular: 90, minutos_banquillo: 0, goles_banquillo: 0, banquillo_no_jugados: 1,
        porcentaje_goles_partido: 0, porcentaje_goles_banquillo: null }
    ]);
  });

  it('sin partidos devuelve una lista vacía', async () => {
    Partido.findAll.mockResolvedValue([]);
    const { promesa, res } = llamar({ query: { id_plantilla: '5' } });
    await promesa;
    expect(res._json).toEqual([]);
    expect(PartidoJugador.findAll).not.toHaveBeenCalled();
  });
});
