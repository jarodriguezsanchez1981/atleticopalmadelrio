import { describe, it, expect } from 'vitest';
import { colorPosicion, jornadasDescanso, COLOR_SUBIDA, COLOR_BAJADA, COLOR_IGUAL } from '../utils/colorPosicion';

describe('colorPosicion', () => {
  it('sube verde, baja rojo, igual amarillo', () => {
    const p = [5, 3, 4, 4];
    expect(colorPosicion(p, 0)).toBe(COLOR_IGUAL);
    expect(colorPosicion(p, 1)).toBe(COLOR_SUBIDA);
    expect(colorPosicion(p, 2)).toBe(COLOR_BAJADA);
    expect(colorPosicion(p, 3)).toBe(COLOR_IGUAL);
  });

  it('la jornada en la que descansa va en amarillo aunque baje', () => {
    const p = [2, 5];
    expect(colorPosicion(p, 1, [false, true])).toBe(COLOR_IGUAL);
  });
});

describe('jornadasDescanso', () => {
  it('marca las jornadas en las que no cambian los partidos jugados', () => {
    expect(jornadasDescanso([1, 2, 3, 3, 4])).toEqual([false, false, false, true, false]);
  });
});
