import { describe, it, expect } from 'vitest';
import { estadoRequisitos, passwordValida } from '../utils/requisitosPassword';

const cumplidos = (p) => estadoRequisitos(p).filter((r) => r.ok).map((r) => r.clave);

describe('requisitosPassword', () => {
  it('marca cada requisito según se va cumpliendo', () => {
    expect(cumplidos('')).toEqual([]);
    expect(cumplidos('a')).toEqual(['minuscula', 'espacios']);
    expect(cumplidos('aB')).toEqual(['minuscula', 'mayuscula', 'espacios']);
    expect(cumplidos('aB1')).toEqual(['minuscula', 'mayuscula', 'numero', 'espacios']);
    expect(cumplidos('aB1#')).toEqual(['minuscula', 'mayuscula', 'numero', 'simbolo', 'espacios']);
  });

  it('solo es válida si los cumple todos (como el backend)', () => {
    expect(passwordValida('Nueva#2026')).toBe(true);
    expect(passwordValida('aB1#')).toBe(false);
    expect(passwordValida('nueva#2026')).toBe(false);
    expect(passwordValida('Nueva 2026#')).toBe(false);
  });
});
