import { describe, it, expect } from 'vitest';
import { construirMinutosPorJornada, hojaMinutosPorJornada } from '../utils/minutosJornada';

const filas = [
  { id_jugador: 1, jugador: 'Ana', partidos_minutos: [
    { id_partido: 10, jornada: 1, es_local: true, rival: 'RIVAL A', titular: true, minutos: 90, amarillas: 1, rojas: 0 },
    { id_partido: 30, jornada: 3, es_local: true, rival: 'RIVAL C', titular: false, minutos: 0, amarillas: 0, rojas: 1 }
  ] },
  { id_jugador: 2, jugador: 'Luis', partidos_minutos: [
    { id_partido: 20, jornada: 2, es_local: false, rival: 'RIVAL B', titular: false, minutos: 25 },
    { id_partido: 10, jornada: 1, es_local: true, rival: 'RIVAL A', titular: true, minutos: 65 }
  ] }
];

describe('minutosJornada · construirMinutosPorJornada', () => {
  it('una columna por jornada (de todos los jugadores), ordenadas, con el rival', () => {
    const { jornadas } = construirMinutosPorJornada(filas);
    expect(jornadas).toEqual([
      { clave: 'p10', jornada: 1, rival: 'RIVAL A', es_local: true },
      { clave: 'p20', jornada: 2, rival: 'RIVAL B', es_local: false },
      { clave: 'p30', jornada: 3, rival: 'RIVAL C', es_local: true }
    ]);
  });

  it('por jugador, los minutos de cada jornada (null si no está en el acta) y el total', () => {
    const { filas: res } = construirMinutosPorJornada(filas);
    expect(res[0]).toMatchObject({ id_jugador: 1, jugador: 'Ana', total: 90 });
    expect(res[0].celdas).toEqual({
      p10: { minutos: 90, titular: true, amarillas: 1, rojas: 0 },
      p30: { minutos: 0, titular: false, amarillas: 0, rojas: 1 }
    });
    // Sin datos de tarjetas, 0.
    expect(res[1].celdas.p20).toEqual({ minutos: 25, titular: false, amarillas: 0, rojas: 0 });
    expect(res[0].celdas.p20).toBeUndefined();
    expect(res[1]).toMatchObject({ jugador: 'Luis', total: 90 });
  });

  it('sin filas, sin jornadas', () => {
    expect(construirMinutosPorJornada([])).toEqual({ jornadas: [], filas: [] });
  });

  it('hoja de Excel: Jugador, J1…, Total; vacío si no está en el acta', () => {
    const hoja = hojaMinutosPorJornada(filas);
    expect(hoja.cabeceras).toEqual([['Jugador', 'J1 RIVAL A', 'J2 RIVAL B', 'J3 RIVAL C', 'Total']]);
    expect(hoja.filas).toEqual([['Ana', 90, null, 0, 90], ['Luis', 65, 25, null, 90]]);
  });
});
