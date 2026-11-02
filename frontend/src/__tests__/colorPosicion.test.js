import { describe, it, expect } from 'vitest';
import { colorPosicion, jornadasDescanso, resultadosJornadas, COLOR_SUBIDA, COLOR_BAJADA, COLOR_IGUAL } from '../utils/colorPosicion';

describe('colorPosicion', () => {
  it('sube verde, baja rojo, igual amarillo', () => {
    const p = [5, 3, 4, 4];
    expect(colorPosicion(p, 0)).toBe(COLOR_IGUAL);
    expect(colorPosicion(p, 1)).toBe(COLOR_SUBIDA);
    expect(colorPosicion(p, 2)).toBe(COLOR_BAJADA);
    expect(colorPosicion(p, 3)).toBe(COLOR_IGUAL);
  });

  it('si se mantiene en el mismo puesto, según el resultado: ganó verde, empató amarillo, perdió rojo', () => {
    // 1º, gana y sigue 1º; empata y sigue 1º; pierde y sigue 1º.
    const p = [1, 1, 1, 1];
    const r = ['G', 'G', 'E', 'P'];
    expect(colorPosicion(p, 1, [], r)).toBe(COLOR_SUBIDA);
    expect(colorPosicion(p, 2, [], r)).toBe(COLOR_IGUAL);
    expect(colorPosicion(p, 3, [], r)).toBe(COLOR_BAJADA);
    // La primera jornada (sin anterior), también por el resultado.
    expect(colorPosicion(p, 0, [], r)).toBe(COLOR_SUBIDA);
  });

  it('subir y bajar de puesto manda sobre el resultado', () => {
    const p = [3, 2, 4];
    const r = ['G', 'P', 'G'];
    expect(colorPosicion(p, 1, [], r)).toBe(COLOR_SUBIDA);
    expect(colorPosicion(p, 2, [], r)).toBe(COLOR_BAJADA);
  });

  it('la jornada en la que descansa va en amarillo aunque baje', () => {
    const p = [2, 5];
    expect(colorPosicion(p, 1, [false, true])).toBe(COLOR_IGUAL);
  });
});

describe('resultadosJornadas', () => {
  it('saca el resultado de cada jornada de G/E/P acumulados (null si descansa o faltan datos)', () => {
    const filas = [
      { ganados: 0, empatados: 0, perdidos: 1 },
      { ganados: 1, empatados: 0, perdidos: 1 },
      { ganados: 1, empatados: 1, perdidos: 1 },
      { ganados: 1, empatados: 1, perdidos: 1 },
      { ganados: null, empatados: 1, perdidos: 1 }
    ];
    expect(resultadosJornadas(filas)).toEqual(['P', 'G', 'E', null, null]);
  });
});

describe('jornadasDescanso', () => {
  it('marca las jornadas en las que no cambian los partidos jugados', () => {
    expect(jornadasDescanso([1, 2, 3, 3, 4])).toEqual([false, false, false, true, false]);
  });
});
