import { describe, it, expect } from 'vitest';
import { golesPartido } from '../utils/resultadoPartido.js';

describe('resultadoPartido · golesPartido', () => {
  it('separa los goles del local y del visitante', () => {
    expect(golesPartido('2-1')).toEqual({ local: '2', visitante: '1' });
    expect(golesPartido(' 0 - 4 ')).toEqual({ local: '0', visitante: '4' });
  });
  it('sin resultado (o con formato raro) devuelve null', () => {
    expect(golesPartido(null)).toBeNull();
    expect(golesPartido('')).toBeNull();
    expect(golesPartido('2-')).toBeNull();
    expect(golesPartido('aplazado')).toBeNull();
  });
});
