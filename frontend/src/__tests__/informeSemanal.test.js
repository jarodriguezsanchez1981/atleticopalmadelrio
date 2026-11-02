import { describe, it, expect } from 'vitest';
import { opcionesFinDeSemana } from '../utils/informeSemanal';

describe('informeSemanal · opcionesFinDeSemana', () => {
  it('los últimos fines de semana, del más reciente al más antiguo, con el viernes', () => {
    expect(opcionesFinDeSemana('2026-11-02', 3)).toEqual([
      { value: '2026-11-02', label: 'Fin de semana del 30/10/2026' },
      { value: '2026-10-26', label: 'Fin de semana del 23/10/2026' },
      { value: '2026-10-19', label: 'Fin de semana del 16/10/2026' }
    ]);
  });

  it('por defecto, 12 semanas; sin lunes, ninguna', () => {
    expect(opcionesFinDeSemana('2026-11-02')).toHaveLength(12);
    expect(opcionesFinDeSemana(null)).toEqual([]);
  });
});
