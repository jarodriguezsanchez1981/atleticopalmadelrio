import { describe, it, expect } from 'vitest';
import { construirMinutosPorJornada, hojaMinutosPorJornada, estiloCss, valorCelda, nombreEnDosLineas } from '../utils/minutosJornada';

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

  it('lesionado / sancionado: en ausencias, también con columna aunque nadie esté en ese acta', () => {
    const { jornadas, filas: res } = construirMinutosPorJornada([{ id_jugador: 3, jugador: 'Eva', partidos_minutos: [], partidos_ausencias: [
      { id_partido: 40, jornada: 4, es_local: false, rival: 'RIVAL D', fecha: '2026-10-12T16:00:00Z', lesion: true, sancion: false },
      { id_partido: 50, jornada: 5, es_local: true, rival: 'RIVAL E', lesion: false, sancion: true }
    ] }]);
    expect(jornadas.map((j) => j.clave)).toEqual(['p40', 'p50']);
    expect(res[0].ausencias).toEqual({ p40: 'lesion', p50: 'sancion' });
  });

  it('hoja de Excel: Jornada, Fecha y Equipo (azul en casa, rojo fuera), "L" lesionado y colores por tarjeta / sanción', () => {
    const hoja = hojaMinutosPorJornada([
      { id_jugador: 1, jugador: 'Ana', partidos_minutos: [
        { id_partido: 10, jornada: 1, fecha: '2026-09-06T16:00:00Z', es_local: true, rival: 'RIVAL A', minutos: 90, amarillas: 1 },
        { id_partido: 20, jornada: 2, es_local: false, rival: 'RIVAL B', minutos: 70, amarillas: 2, rojas: 1 },
        { id_partido: 30, jornada: 3, es_local: true, rival: 'RIVAL C', minutos: 30, rojas: 1 }
      ] },
      { id_jugador: 2, jugador: 'Luis', partidos_minutos: [
        { id_partido: 10, jornada: 1, es_local: true, rival: 'RIVAL A', minutos: 0 }
      ], partidos_ausencias: [
        { id_partido: 20, jornada: 2, es_local: false, rival: 'RIVAL B', lesion: true },
        { id_partido: 30, jornada: 3, es_local: true, rival: 'RIVAL C', sancion: true }
      ] }
    ]);
    expect(hoja.cabeceras).toEqual([
      ['Jornada', 'J1', 'J2', 'J3', 'Total'],
      ['Fecha', '06/09/2026', '', '', ''],
      ['Equipo', 'RIVAL\nA', 'RIVAL\nB', 'RIVAL\nC', '']
    ]);
    expect(hoja.combinadas).toEqual([[0, 4, 2, 4]]);
    expect(hoja.estilosCabecera[2].slice(1).map((e) => e.fondo)).toEqual(['FF1E88E5', 'FFE53935', 'FF1E88E5']);
    expect(hoja.filas).toEqual([['Ana', 90, 70, 30, 190], ['Luis', 0, 'L', null, 0]]);
    const fondos = hoja.estilos.map((f) => f.map((e) => e?.fondo ?? null));
    // Amarilla, doble amarilla (aunque el acta traiga también la roja) y roja.
    expect(fondos[0]).toEqual([null, 'FFFFEB3B', 'FFFF9800', 'FFE53935', null]);
    // Lesionado sin color; sancionado en azul.
    expect(fondos[1]).toEqual([null, null, null, 'FF1E88E5', null]);
    expect(hoja.leyenda.map((e) => e.etiqueta)).toContain('L: lesionado');
  });

  it('hoja de Excel: titular en negrita negra, suplente que entra en negrita roja y suplente con roja en blanco sobre rojo', () => {
    const hoja = hojaMinutosPorJornada([{ id_jugador: 1, jugador: 'Ana', partidos_minutos: [
      { id_partido: 10, jornada: 1, titular: true, minutos: 90 },
      { id_partido: 20, jornada: 2, titular: false, minutos: 25 },
      { id_partido: 30, jornada: 3, titular: false, minutos: 0, rojas: 1 },
      { id_partido: 40, jornada: 4, titular: false, minutos: 0 },
      { id_partido: 50, jornada: 5, titular: false, minutos: 20, amarillas: 1 }
    ] }]);
    const [, j1, j2, j3, j4, j5] = hoja.estilos[0];
    expect(j1).toEqual({ fondo: null, colorTexto: null, negrita: true });
    expect(j2).toEqual({ fondo: null, colorTexto: 'FFE53935', negrita: true });
    expect(j3).toEqual({ fondo: 'FFE53935', colorTexto: 'FFFFFFFF' });
    // Suplente sin jugar ni tarjetas: sin estilo.
    expect(j4).toBeNull();
    expect(j5).toEqual({ fondo: 'FFFFEB3B', colorTexto: 'FFE53935', negrita: true });
  });

  it('en pantalla, el mismo estilo que en el Excel como CSS, y el valor de la celda', () => {
    expect(estiloCss({ fondo: 'FFE53935', colorTexto: 'FFFFFFFF', negrita: true }))
      .toEqual({ backgroundColor: '#E53935', color: '#FFFFFF', fontWeight: 600 });
    expect(estiloCss(null)).toBeNull();
    const fila = { celdas: { p1: { minutos: 0 } }, ausencias: { p2: 'lesion', p3: 'sancion' } };
    expect(['p1', 'p2', 'p3', 'p4'].map((c) => valorCelda(fila, c))).toEqual([0, 'L', null, null]);
  });

  it('nombre del rival en dos líneas parejas', () => {
    expect(nombreEnDosLineas('C.D. ATLETICO ESPELEÑO')).toBe('C.D. ATLETICO\nESPELEÑO');
    expect(nombreEnDosLineas('  U.D.  LA CARLOTA ')).toBe('U.D. LA\nCARLOTA');
    expect(nombreEnDosLineas('ESPELEÑO')).toBe('ESPELEÑO');
    expect(nombreEnDosLineas(null)).toBe('');
  });
});
