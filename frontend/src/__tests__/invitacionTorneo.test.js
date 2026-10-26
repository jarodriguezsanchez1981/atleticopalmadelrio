import { describe, it, expect } from 'vitest';
import { construirInvitacion, formatearFechaCarta } from '../utils/pdfInvitacionTorneo.js';

describe('pdfInvitacionTorneo · formatearFechaCarta', () => {
  it('formatea una fecha como "Sábado, 31 de octubre" (sin año)', () => {
    expect(formatearFechaCarta('2026-10-31')).toBe('Sábado, 31 de octubre');
    expect(formatearFechaCarta(new Date(2026, 9, 31))).toBe('Sábado, 31 de octubre');
  });

  it('una fecha vacía o inválida devuelve cadena vacía', () => {
    expect(formatearFechaCarta(null)).toBe('');
    expect(formatearFechaCarta('no-es-fecha')).toBe('');
  });
});

describe('pdfInvitacionTorneo · construirInvitacion', () => {
  const valores = {
    nombreTorneo: 'Torneo de Fútbol de Bebés',
    fecha: '2026-10-31',
    hora: '10:00 a 14:00 h',
    lugar: 'Palma del Río (Córdoba)',
    categoria: 'Bebés'
  };

  it('usa los valores del formulario en el subtítulo, el cuerpo y la tabla', () => {
    const inv = construirInvitacion(valores);
    expect(inv.subtitulo).toBe('Invitación oficial · Torneo de Fútbol de Bebés');
    expect(inv.parrafos[1]).toContain('Torneo de Fútbol de Bebés');
    expect(inv.parrafos[1]).toContain('en la categoría Bebés');
    expect(inv.parrafos[2]).toContain('Sábado, 31 de octubre');
    expect(inv.parrafos[2]).toContain('10:00 a 14:00 h');
    expect(inv.parrafos[2]).toContain('Palma del Río (Córdoba)');
    expect(inv.tabla).toEqual([
      ['FECHA', 'Sábado, 31 de octubre'],
      ['HORARIO', '10:00 a 14:00 h'],
      ['LUGAR', 'Palma del Río (Córdoba)'],
      ['CATEGORÍA', 'Bebés'],
      ['ORGANIZA', 'Club Atlético Palma del Río']
    ]);
    expect(inv.firma[1]).toBe('Organización del Torneo de Fútbol de Bebés');
  });

  it('sin categoría no añade la coletilla "en la categoría" y la tabla muestra —', () => {
    const inv = construirInvitacion({ ...valores, categoria: '' });
    expect(inv.parrafos[1]).not.toContain('en la categoría');
    expect(inv.tabla.find((f) => f[0] === 'CATEGORÍA')[1]).toBe('—');
  });

  it('con varias categorías las une con comas e "y" y usa el plural', () => {
    const inv = construirInvitacion({ ...valores, categoria: undefined, categorias: ['Bebé', 'Prebenjamín', 'Benjamín'] });
    expect(inv.parrafos[1]).toContain('en las categorías Bebé, Prebenjamín y Benjamín');
    expect(inv.tabla.find((f) => f[0] === 'CATEGORÍAS')[1]).toBe('Bebé, Prebenjamín y Benjamín');
  });

  it('con una sola categoría en la lista usa el singular', () => {
    const inv = construirInvitacion({ ...valores, categorias: ['Alevín'] });
    expect(inv.parrafos[1]).toContain('en la categoría Alevín');
    expect(inv.tabla.find((f) => f[0] === 'CATEGORÍA')[1]).toBe('Alevín');
  });

  it('con campos vacíos usa valores por defecto sin romperse', () => {
    const inv = construirInvitacion({});
    expect(inv.subtitulo).toBe('Invitación oficial · Torneo de Fútbol');
    expect(inv.tabla.find((f) => f[0] === 'FECHA')[1]).toBe('—');
    expect(inv.tabla.find((f) => f[0] === 'LUGAR')[1]).toBe('—');
    expect(inv.tabla.find((f) => f[0] === 'HORARIO')[1]).toBe('—');
  });
});
