import { describe, it, expect, beforeEach } from 'vitest';
import { Partido, PartidoJugador, PartidoTarjeta, PartidoGol, Plantilla, Temporada } from './helpers/models.js';
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
    // Por defecto, Senior A (categoría con minutos): "jugó" = minutos > 0.
    Plantilla.findByPk.mockReset();
    Plantilla.findByPk.mockResolvedValue({ categoria: { nombre: 'Senior A' } });
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
    Partido.findAll.mockResolvedValue([{ id: 1, jornada: 1, acta_finalizada_at: new Date() }, { id: 2, jornada: 2, acta_finalizada_at: new Date() }]);
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

    expect(Partido.findAll).toHaveBeenCalledWith({ where: { id_plantilla: 5 }, attributes: ['id', 'jornada', 'acta_finalizada_at', 'suspendido'] });
    expect(res._json.map((f) => f.id_jugador)).toEqual([7, 8]);
    const [anaFila, luisFila] = res._json;
    expect(anaFila).toMatchObject({
      nombre: 'Ana', apellidos: 'López',
      convocatorias: 2, partidos: 2, titular: 1, suplente: 1, banquillo_no_jugados: 0,
      minutos: 124, minutos_titular: 90, minutos_banquillo: 34,
      goles: 3, goles_titular: 2, goles_banquillo: 1, goles_primera: 2, goles_segunda: 1,
      // Senior A (90'): tramos de 15 min. 12' → 1er tramo 1ª, 45' → 3er tramo 1ª, 70' → 2º tramo 2ª.
      goles_1t1: 1, goles_1t2: 0, goles_1t3: 1, goles_2t1: 0, goles_2t2: 1, goles_2t3: 0,
      tarjetas_amarillas: 1, tarjetas_rojas: 1,
      porcentaje_goles_partido: 100, partidos_con_gol: 2, porcentaje_goles_titular: 66.7, porcentaje_goles_banquillo: 33.3,
      porcentaje_goles_titular_local: 100, porcentaje_goles_titular_visitante: 0,
      // 124' de 180' posibles: 90' de 90' en casa y 34' de 90' fuera.
      porcentaje_minutos: 68.9, porcentaje_minutos_local: 100, porcentaje_minutos_visitante: 37.8,
      // Sobre todos los partidos del equipo (2: uno en casa y otro fuera).
      porcentaje_minutos_equipo: 68.9, porcentaje_minutos_equipo_local: 100, porcentaje_minutos_equipo_visitante: 37.8,
      porcentaje_goles_local: 66.7, porcentaje_goles_visitante: 33.3,
      // En casa (partido 1): titular, 90', 2 goles en la 1ª parte, amarilla.
      convocatorias_local: 1, partidos_local: 1, titular_local: 1, suplente_local: 0, minutos_local: 90,
      minutos_titular_local: 90, goles_local: 2, goles_titular_local: 2, goles_primera_local: 2, goles_segunda_local: 0,
      goles_1t1_local: 1, goles_1t3_local: 1, goles_2t2_local: 0,
      tarjetas_amarillas_local: 1, tarjetas_rojas_local: 0, porcentaje_goles_partido_local: 100, partidos_con_gol_local: 1,
      // Fuera (partido 2): entra en el 56, 34', 1 gol en la 2ª parte, roja.
      convocatorias_visitante: 1, partidos_visitante: 1, titular_visitante: 0, suplente_visitante: 1, minutos_visitante: 34,
      minutos_banquillo_visitante: 34, goles_visitante: 1, goles_banquillo_visitante: 1, goles_primera_visitante: 0,
      goles_segunda_visitante: 1, goles_2t2_visitante: 1, goles_1t1_visitante: 0,
      tarjetas_amarillas_visitante: 0, tarjetas_rojas_visitante: 1,
      porcentaje_goles_partido_visitante: 100, porcentaje_goles_banquillo_visitante: 100
    });
    expect(luisFila).toMatchObject({
      convocatorias: 2, partidos: 1, titular: 1, banquillo_no_jugados: 1, minutos: 90, goles: 0,
      porcentaje_goles_partido: 0, porcentaje_goles_titular: null, porcentaje_goles_banquillo: null,
      // Fuera no jugó ningún partido: sin porcentaje.
      porcentaje_minutos: 100, porcentaje_minutos_local: 100, porcentaje_minutos_visitante: null,
      // 90' de los 180' del equipo; fuera estuvo en el banquillo: 0 %.
      porcentaje_minutos_equipo: 50, porcentaje_minutos_equipo_local: 100, porcentaje_minutos_equipo_visitante: 0,
      porcentaje_goles_local: null, porcentaje_goles_visitante: null,
      banquillo_no_jugados_local: 0, banquillo_no_jugados_visitante: 1,
      partidos_visitante: 0, porcentaje_goles_partido_visitante: null
    });
  });

  it('cuenta las sustituciones (sale antes del final), pero no las expulsiones', async () => {
    Partido.findAll.mockResolvedValue([{ id: 1, jornada: 1, acta_finalizada_at: new Date() }, { id: 2, jornada: 2, acta_finalizada_at: new Date() }, { id: 3, jornada: 3, acta_finalizada_at: new Date() }, { id: 4, jornada: 4, acta_finalizada_at: new Date() }]);
    const ana = { nombre: 'Ana', apellidos: 'López' };
    PartidoJugador.findAll.mockResolvedValue([
      { id_partido: 1, id_jugador: 7, es_local: true, titular: true, minuto_salida: 70, minutos: 70, tarjeta_roja: 0, jugador: ana },  // cambiada
      { id_partido: 2, id_jugador: 7, es_local: false, titular: true, minuto_salida: 60, minutos: 60, tarjeta_roja: 1, jugador: ana }, // expulsada en el 60
      { id_partido: 3, id_jugador: 7, es_local: false, titular: true, minuto_salida: 50, minutos: 50, tarjeta_roja: 1, jugador: ana }, // cambiada en el 50, roja en el banquillo
      { id_partido: 4, id_jugador: 7, es_local: true, titular: true, minuto_salida: 45, minutos: 45, tarjeta_roja: 0, jugador: ana }   // cambiada en el descanso (1ª parte)
    ]);
    PartidoTarjeta.findAll.mockResolvedValue([
      { id_partido: 2, id_jugador: 7, tipo: 'roja', minuto: 60, goles_favor: 0, goles_contra: 0 },
      { id_partido: 3, id_jugador: 7, tipo: 'roja', minuto: 88, goles_favor: 0, goles_contra: 0 }
    ]);

    const { promesa, res } = llamar({ query: { id_plantilla: '5' } });
    await promesa;

    expect(res._json[0]).toMatchObject({
      sustituciones: 3, sustituciones_local: 2, sustituciones_visitante: 1,
      sustituciones_primera: 1, sustituciones_primera_local: 1,
      sustituciones_segunda: 2, sustituciones_segunda_local: 1, sustituciones_segunda_visitante: 1
    });
  });

  it('solo cuenta los partidos de liga (con jornada): ignora los amistosos', async () => {
    // El partido 2 es un amistoso (sin jornada): no debe entrar en el cálculo.
    Partido.findAll.mockResolvedValue([{ id: 1, jornada: 1, acta_finalizada_at: new Date() }, { id: 2, jornada: null, acta_finalizada_at: new Date() }]);
    const ana = { id: 7, nombre: 'Ana', apellidos: 'López' };
    // El mock devuelve lo que daría la BD para id_partido IN (1): solo el de liga.
    PartidoJugador.findAll.mockResolvedValue([
      { id_partido: 1, id_jugador: 7, es_local: true, titular: true, minutos: 90, goles: 1, tarjeta_amarilla: 0, tarjeta_roja: 0, jugador: ana }
    ]);
    const { promesa, res } = llamar({ query: { id_plantilla: '5' } });
    await promesa;
    // Solo pide los jugadores del partido de liga (el 1), no del amistoso (el 2).
    expect(PartidoJugador.findAll.mock.calls[0][0].where).toEqual({ id_partido: [1] });
    const fila = res._json.find((f) => f.id_jugador === 7);
    expect(fila.goles).toBe(1);
    expect(fila.partidos).toBe(1);
  });

  it('no cuenta un partido con convocatoria pero sin acta finalizada', async () => {
    // El 1 está finalizado (acta); el 2 solo tiene la convocatoria previa (sin finalizar).
    Partido.findAll.mockResolvedValue([
      { id: 1, jornada: 1, acta_finalizada_at: new Date() },
      { id: 2, jornada: 2, acta_finalizada_at: null }
    ]);
    const ana = { id: 7, nombre: 'Ana', apellidos: 'López' };
    PartidoJugador.findAll.mockResolvedValue([
      { id_partido: 1, id_jugador: 7, es_local: true, titular: true, minutos: 90, goles: 1, tarjeta_amarilla: 0, tarjeta_roja: 0, jugador: ana }
    ]);
    const { promesa, res } = llamar({ query: { id_plantilla: '5' } });
    await promesa;
    // Solo se piden los jugadores del partido finalizado (el 1).
    expect(PartidoJugador.findAll.mock.calls[0][0].where).toEqual({ id_partido: [1] });
    expect(res._json.find((f) => f.id_jugador === 7).convocatorias).toBe(1);
  });

  it('no cuenta un partido suspendido aunque esté finalizado', async () => {
    Partido.findAll.mockResolvedValue([
      { id: 1, jornada: 1, acta_finalizada_at: new Date(), suspendido: false },
      { id: 2, jornada: 2, acta_finalizada_at: new Date(), suspendido: true }
    ]);
    const ana = { id: 7, nombre: 'Ana', apellidos: 'López' };
    PartidoJugador.findAll.mockResolvedValue([
      { id_partido: 1, id_jugador: 7, es_local: true, titular: true, minutos: 90, goles: 1, tarjeta_amarilla: 0, tarjeta_roja: 0, jugador: ana }
    ]);
    const { promesa, res } = llamar({ query: { id_plantilla: '5' } });
    await promesa;
    expect(PartidoJugador.findAll.mock.calls[0][0].where).toEqual({ id_partido: [1] });
    expect(res._json.find((f) => f.id_jugador === 7).convocatorias).toBe(1);
  });

  it('sin partidos devuelve una lista vacía', async () => {
    Partido.findAll.mockResolvedValue([]);
    const { promesa, res } = llamar({ query: { id_plantilla: '5' } });
    await promesa;
    expect(res._json).toEqual([]);
    expect(PartidoJugador.findAll).not.toHaveBeenCalled();
  });

  it('reparte las tarjetas por parte y según el marcador', async () => {
    Partido.findAll.mockResolvedValue([{ id: 1, jornada: 1, acta_finalizada_at: new Date() }, { id: 2, jornada: 2, acta_finalizada_at: new Date() }]);
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
      // Partido 1 (en casa): 2 amarillas al mismo jugador → una doble amarilla.
      dobles_amarillas: 1, dobles_amarillas_local: 1, dobles_amarillas_visitante: 0,
      amarillas_primera: 2, amarillas_segunda: 1, amarillas_ganando: 1, amarillas_perdiendo: 1,
      rojas_primera: 0, rojas_segunda: 1, rojas_ganando: 0, rojas_perdiendo: 1,
      // Tres en casa (partido 1) y una fuera (partido 2).
      amarillas_primera_local: 2, amarillas_ganando_local: 1, rojas_segunda_local: 1, rojas_perdiendo_local: 1,
      amarillas_segunda_visitante: 1, amarillas_perdiendo_visitante: 1, amarillas_primera_visitante: 0
    });
  });

  it('en una categoría sin minutos, aparecer en el acta cuenta como partido jugado', async () => {
    // Infantil A (no Senior A): el acta no trae minutos; un suplente que aparece ha jugado.
    Plantilla.findByPk.mockResolvedValue({ categoria: { nombre: 'Infantil A' } });
    Partido.findAll.mockResolvedValue([{ id: 1, jornada: 1, acta_finalizada_at: new Date() }, { id: 2, jornada: 2, acta_finalizada_at: new Date() }]);
    const nora = { id: 7, nombre: 'Nora', apellidos: 'Gil' };
    PartidoJugador.findAll.mockResolvedValue([
      // Sin minutos (null) ni minuto_entrada: aun así, al estar en el acta, jugó.
      { id_partido: 1, id_jugador: 7, es_local: true, titular: false, minuto_entrada: null, minutos: null, goles: 1, tarjeta_amarilla: 0, tarjeta_roja: 0, jugador: nora },
      { id_partido: 2, id_jugador: 7, es_local: true, titular: true, minuto_entrada: null, minutos: null, goles: 0, tarjeta_amarilla: 0, tarjeta_roja: 0, jugador: nora }
    ]);

    const { promesa, res } = llamar({ query: { id_plantilla: '5' } });
    await promesa;

    const fila = res._json.find((f) => f.id_jugador === 7);
    expect(fila).toMatchObject({
      convocatorias: 2,
      partidos: 2,              // los dos partidos cuentan como jugados
      banquillo_no_jugados: 0,  // no existe "sin jugar" sin minutos
      suplente: 1,              // el partido 1 lo jugó de suplente
      titular: 1,
      goles: 1,
      partidos_con_gol: 1,
      porcentaje_goles_partido: 50
    });
  });

  it('en Fútbol 7 (60\') reparte los goles en tercios de 30\' por parte', async () => {
    // Benjamín A (Fútbol 7, id_tipofutbol 1): duración 60', sextos de 10' (10/20/30/40/50).
    Plantilla.findByPk.mockResolvedValue({ categoria: { nombre: 'Benjamin A', id_tipofutbol: 1 } });
    Partido.findAll.mockResolvedValue([{ id: 1, jornada: 1, acta_finalizada_at: new Date(), suspendido: false }]);
    const nora = { id: 7, nombre: 'Nora', apellidos: 'Gil' };
    PartidoJugador.findAll.mockResolvedValue([
      { id_partido: 1, id_jugador: 7, es_local: true, titular: null, minuto_entrada: null, minutos: null, goles: 2, tarjeta_amarilla: 0, tarjeta_roja: 0, jugador: nora }
    ]);
    PartidoGol.findAll.mockResolvedValue([
      { id_partido: 1, id_jugador: 7, minuto: 30 }, // 3er tramo de la 1ª parte (<=30)
      { id_partido: 1, id_jugador: 7, minuto: 55 }  // pasa de 50: último tramo de la 2ª parte
    ]);
    const { promesa, res } = llamar({ query: { id_plantilla: '26' } });
    await promesa;
    expect(res._json.find((f) => f.id_jugador === 7)).toMatchObject({
      goles: 2, goles_1t1: 0, goles_1t2: 0, goles_1t3: 1, goles_2t1: 0, goles_2t2: 0, goles_2t3: 1
    });
  });

  describe('equipo', () => {
    function llamarEquipo(overrides = {}) {
      const { req, res, next } = mockReqRes(overrides);
      return { promesa: ctrl.equipo(req, res, next), res };
    }

    it('exige la plantilla', async () => {
      const { promesa, res } = llamarEquipo({ query: {} });
      await promesa;
      expect(res._status).toBe(400);
    });

    it('suma resultados, goles, penaltis y tarjetas del PALMA como local y visitante', async () => {
      Partido.findAll.mockResolvedValue([
        // En casa 2-1 (gana), con penaltis guardados.
        { id: 1, jornada: 1, id_equipo_local: 73, id_equipo_visitante: 50, resultado: '2-1', suspendido: false, goles_penalti_favor: 1, goles_penalti_contra: 1 },
        // Fuera 3-0 (pierde); acta antigua: penaltis a favor desde partido_goles.
        { id: 2, jornada: 2, id_equipo_local: 60, id_equipo_visitante: 73, resultado: '3-0', suspendido: false, goles_penalti_favor: null, goles_penalti_contra: null },
        // Fuera 1-1 (empata), penalti a favor desde partido_goles.
        { id: 3, jornada: 3, id_equipo_local: 61, id_equipo_visitante: 73, resultado: '1 - 1', suspendido: false, goles_penalti_favor: null, goles_penalti_contra: 0 },
        { id: 4, jornada: 4, id_equipo_local: 73, id_equipo_visitante: 62, resultado: null, suspendido: false },  // sin jugar
        { id: 5, jornada: 5, id_equipo_local: 73, id_equipo_visitante: 63, resultado: '0-0', suspendido: true },  // suspendido
        { id: 6, jornada: null, id_equipo_local: 73, id_equipo_visitante: 64, resultado: '9-0', suspendido: false } // amistoso: no cuenta (sin jornada)
      ]);
      PartidoGol.findAll.mockResolvedValue([{ id_partido: 3, id_jugador: 7, tipo: 'penalti' }]);
      PartidoJugador.findAll.mockResolvedValue([
        { id_partido: 1, id_jugador: 7, es_local: true, titular: true, goles: 1, tarjeta_amarilla: 1, tarjeta_roja: 0 },
        { id_partido: 1, id_jugador: 9, es_local: true, titular: false, minuto_entrada: 60, goles: 1, tarjeta_amarilla: 0, tarjeta_roja: 0 },
        { id_partido: 1, id_jugador: 10, es_local: true, titular: false, minuto_entrada: null, goles: 0, tarjeta_amarilla: 0, tarjeta_roja: 1 }, // roja en el banquillo
        { id_partido: 1, id_jugador: null, es_local: false, goles: 1, tarjeta_amarilla: 2, tarjeta_roja: 1 }, // rival
        { id_partido: 2, id_jugador: 8, es_local: false, titular: 1, goles: 0, tarjeta_amarilla: 1, tarjeta_roja: 1 },
        { id_partido: 3, id_jugador: 8, es_local: false, titular: 1, goles: 1, tarjeta_amarilla: 1, tarjeta_roja: 0 }
      ]);

      const { promesa, res } = llamarEquipo({ query: { id_plantilla: '5' } });
      await promesa;

      expect(PartidoGol.findAll).toHaveBeenCalledWith({ where: { id_partido: [2, 3], tipo: 'penalti' } });
      expect(res._json).toMatchObject({
        partidos: 3, partidos_local: 1, partidos_visitante: 2,
        victorias: 1, victorias_local: 1, empates: 1, empates_visitante: 1, derrotas: 1, derrotas_visitante: 1,
        goles_favor: 3, goles_favor_local: 2, goles_favor_visitante: 1,
        goles_contra: 5, goles_contra_local: 1, goles_contra_visitante: 4,
        goles_penalti_favor: 2, goles_penalti_favor_local: 1, goles_penalti_favor_visitante: 1,
        goles_penalti_contra: 1, goles_penalti_contra_local: 1,
        tarjetas_amarillas: 3, tarjetas_amarillas_local: 1, tarjetas_amarillas_visitante: 2,
        tarjetas_rojas: 2, tarjetas_rojas_local: 1, tarjetas_rojas_visitante: 1,
        media_goles_favor: 1, media_goles_contra: 1.67, media_goles_favor_visitante: 0.5,
        media_amarillas: 1, media_rojas: 0.67, media_rojas_local: 1,
        amarillas_titulares: 3, amarillas_suplentes: 0, rojas_titulares: 1, rojas_suplentes: 1, rojas_suplentes_local: 1,
        media_amarillas_titulares: 1, media_amarillas_suplentes: 0, media_rojas_titulares: 0.33, media_rojas_suplentes: 0.33,
        media_rojas_suplentes_local: 1, media_rojas_titulares_visitante: 0.5,
        goles_titulares: 2, goles_titulares_local: 1, goles_titulares_visitante: 1, goles_suplentes: 1, goles_suplentes_local: 1,
        media_goles_titulares: 0.67, media_goles_suplentes: 0.33, media_goles_suplentes_local: 1, media_goles_suplentes_visitante: 0,
        sin_penaltis: 1
      });
    });

    it('sin partidos jugados, todo a cero y medias vacías', async () => {
      Partido.findAll.mockResolvedValue([]);
      const { promesa, res } = llamarEquipo({ query: { id_plantilla: '5' } });
      await promesa;
      expect(res._json).toMatchObject({ partidos: 0, victorias: 0, media_goles_favor: null });
    });
  });

  describe('balance', () => {
    function llamarBalance(overrides = {}) {
      const { req, res, next } = mockReqRes(overrides);
      return { promesa: ctrl.balance(req, res, next), res };
    }
    const plantilla = (id, nombre, orden, idTipo, tipo) => ({
      id, id_categoria: id * 10,
      categoria: { id: id * 10, nombre, alias: null, orden, id_tipofutbol: idTipo, tipofutbol: { id: idTipo, nombre: tipo } }
    });

    beforeEach(() => {
      Temporada.findOne.mockReset();
      Plantilla.findAll.mockReset();
      Partido.findAll.mockReset();
    });

    it('sin temporada actual devuelve una lista vacía', async () => {
      Temporada.findOne.mockResolvedValue(null);
      const { promesa, res } = llamarBalance();
      await promesa;
      expect(res._json).toEqual([]);
    });

    it('suma victorias, empates y derrotas de todas las categorías por jornada y tipo de fútbol, y Senior A aparte partido a partido', async () => {
      Temporada.findOne.mockResolvedValue({ id: 3, nombre: '2026/2027' });
      Plantilla.findAll.mockResolvedValue([
        plantilla(2, 'Senior A', 30, 2, 'Fútbol 11'),
        plantilla(1, 'Benjamin A', 7, 1, 'Fútbol 7'),
        plantilla(4, 'Prebenjamin C', 2, 1, 'Fútbol 7'),
        plantilla(5, 'Cadete A', 20, 2, 'Fútbol 11'),
        plantilla(6, 'Bebe', 1, 1, 'Fútbol 7') // sin partidos de liga: no cuenta como equipo
      ]);
      const rival = { nombre: 'RIVAL C.F.' };
      // Mismo fin de semana (12 sáb y 13 dom); la jornada 3 de F7, otro finde (27 dom).
      Partido.findAll.mockResolvedValue([
        { id: 1, id_plantilla: 1, jornada: 1, fecha: '2026-09-13', id_equipo_local: 73, id_equipo_visitante: 50, resultado: '3-1', suspendido: false }, // gana (dom)
        { id: 9, id_plantilla: 4, jornada: 1, fecha: '2026-09-12', id_equipo_local: 73, id_equipo_visitante: 51, resultado: '0-0', suspendido: false }, // empata (sáb, mismo finde)
        { id: 2, id_plantilla: 1, jornada: 3, fecha: '2026-09-27', id_equipo_local: 50, id_equipo_visitante: 73, resultado: '2-0', suspendido: false }, // pierde
        { id: 3, id_plantilla: 4, jornada: 3, fecha: '2026-09-27', id_equipo_local: 50, id_equipo_visitante: 73, resultado: '1-4', suspendido: false }, // gana (mismo finde)
        { id: 10, id_plantilla: 1, jornada: 4, fecha: '2026-10-04', id_equipo_local: 73, id_equipo_visitante: 50, resultado: null, suspendido: false }, // sin jugar
        { id: 11, id_plantilla: 1, jornada: null, fecha: '2026-10-05', id_equipo_local: 73, id_equipo_visitante: 50, resultado: '5-0', suspendido: false }, // amistoso
        { id: 7, id_plantilla: 5, jornada: 1, fecha: '2026-09-13', id_equipo_local: 73, id_equipo_visitante: 50, resultado: '0-1', suspendido: false }, // pierde
        { id: 4, id_plantilla: 2, jornada: 1, fecha: '2026-09-06', id_equipo_local: 50, id_equipo_visitante: 73, resultado: '0-4', suspendido: false, equipoLocal: rival },
        { id: 5, id_plantilla: 2, jornada: 2, id_equipo_local: 73, id_equipo_visitante: 50, resultado: null, suspendido: false },  // sin jugar
        { id: 6, id_plantilla: 2, jornada: 2, id_equipo_local: 73, id_equipo_visitante: 50, resultado: '0-3', suspendido: true },  // suspendido
        { id: 8, id_plantilla: 2, jornada: 3, fecha: '2026-09-13', id_equipo_local: 73, id_equipo_visitante: 50, resultado: '1-2', suspendido: false, equipoVisitante: rival }
      ]);

      const { promesa, res } = llamarBalance();
      await promesa;

      expect(Plantilla.findAll.mock.calls[0][0].where).toEqual({ id_temporada: 3 });
      expect(res._json).toEqual([
        // F7: un punto por fin de semana (el 12/13 y el 27), no por número de jornada.
        { clave: 'tipo_1', id_tipofutbol: 1, tipofutbol: 'Fútbol 7', titulo: 'Fútbol 7', equipos: 2, jornadas: [
          { fecha: '2026-09-12', partidos: 2, victorias: 1, empates: 1, derrotas: 0 },
          { fecha: '2026-09-27', partidos: 2, victorias: 1, empates: 0, derrotas: 1 }
        ] },
        { clave: 'tipo_2', id_tipofutbol: 2, tipofutbol: 'Fútbol 11', titulo: 'Fútbol 11', equipos: 1, jornadas: [
          { fecha: '2026-09-13', partidos: 1, victorias: 0, empates: 0, derrotas: 1 }
        ] },
        { clave: 'plantilla_2', id_plantilla: 2, titulo: 'Senior A / 2026/2027', partidos: [
          { id_partido: 4, fecha: '2026-09-06', rival: 'RIVAL C.F.', es_local: false, marcador: '0-4', resultado: 'victoria', victorias: 1, empates: 0, derrotas: 0 },
          { id_partido: 8, fecha: '2026-09-13', rival: 'RIVAL C.F.', es_local: true, marcador: '1-2', resultado: 'derrota', victorias: 1, empates: 0, derrotas: 1 }
        ] }
      ]);
    });

    it('un entrenador solo ve la plantilla de su categoría', async () => {
      Temporada.findOne.mockResolvedValue({ id: 3 });
      Plantilla.findAll.mockResolvedValue([]);
      const { promesa, res } = llamarBalance({ user: { rol: 'entrenador', id_categoria: 10 } });
      await promesa;
      expect(Plantilla.findAll.mock.calls[0][0].where).toEqual({ id_temporada: 3, id_categoria: 10 });
      expect(res._json).toEqual([]);
    });
  });

  describe('plantillasEstadisticas', () => {
    function llamarPlantillas(overrides = {}) {
      const { req, res, next } = mockReqRes(overrides);
      return { promesa: ctrl.plantillasEstadisticas(req, res, next), res };
    }

    beforeEach(() => {
      Temporada.findOne.mockReset();
      Plantilla.findAll.mockReset();
    });

    it('un coordinador recibe las plantillas de la temporada actual (todas las categorías)', async () => {
      Temporada.findOne.mockResolvedValue({ id: 3 });
      const plantillas = [{ id: 1, categoria: { nombre: 'Infantil A' }, temporada: { nombre: '2026/2027' }, jugadores: [] }];
      Plantilla.findAll.mockResolvedValue(plantillas);
      const { promesa, res } = llamarPlantillas();
      await promesa;
      expect(Plantilla.findAll.mock.calls[0][0].where).toEqual({ id_temporada: 3 });
      expect(res._json).toEqual(plantillas);
    });

    it('un entrenador solo recibe las de su categoría', async () => {
      Temporada.findOne.mockResolvedValue({ id: 3 });
      Plantilla.findAll.mockResolvedValue([]);
      const { promesa } = llamarPlantillas({ user: { rol: 'entrenador', id_categoria: 10 } });
      await promesa;
      expect(Plantilla.findAll.mock.calls[0][0].where).toEqual({ id_categoria: 10, id_temporada: 3 });
    });

    it('sin temporada actual no filtra por temporada', async () => {
      Temporada.findOne.mockResolvedValue(null);
      Plantilla.findAll.mockResolvedValue([]);
      const { promesa } = llamarPlantillas();
      await promesa;
      expect(Plantilla.findAll.mock.calls[0][0].where).toEqual({});
    });
  });
});
