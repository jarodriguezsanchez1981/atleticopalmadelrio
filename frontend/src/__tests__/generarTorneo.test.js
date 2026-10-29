import { describe, it, expect } from 'vitest';
import { generarCategoria, CAMPOS, esHoraValida } from '../utils/generarTorneo';

const inscripciones = (nombres, grupo = null) => nombres.map((nombre) => ({ nombre, grupo }));

function categoria(extra = {}) {
  return {
    hora_inicio: '09:00:00',
    hora_fin: null,
    duracion_min: 20,
    descanso_min: 5,
    campos: ['anexo1', 'anexo2'],
    formato: 'liga',
    semifinales: false,
    final_oro: true,
    final_plata: true,
    equipos: inscripciones(['E1', 'E2', 'E3', 'E4']),
    ...extra
  };
}

const partidosDeFase = (r, fase) => r.turnos.filter((t) => t.fase === fase).flatMap((t) => t.partidos);
const pareja = (p) => [p.local, p.visitante].sort().join('|');

function sinEquiposRepetidosPorTurno(r) {
  for (const t of r.turnos) {
    const nombres = t.partidos.flatMap((p) => [p.local, p.visitante]);
    expect(new Set(nombres).size).toBe(nombres.length);
  }
}

/** Ningún equipo juega dos turnos seguidos en la fase de grupos. */
function sinTurnosSeguidos(r) {
  const grupos = r.turnos.filter((t) => t.fase === 'grupos');
  for (let i = 1; i < grupos.length; i++) {
    const antes = new Set(grupos[i - 1].partidos.flatMap((p) => [p.local, p.visitante]));
    for (const p of grupos[i].partidos) {
      expect(antes.has(p.local), `${p.local} juega seguido a las ${grupos[i].hora}`).toBe(false);
      expect(antes.has(p.visitante), `${p.visitante} juega seguido a las ${grupos[i].hora}`).toBe(false);
    }
  }
}

describe('generarTorneo · generarCategoria', () => {
  it('CAMPOS tiene los 4 campos en orden fijo', () => {
    expect(CAMPOS.map((c) => c.clave)).toEqual(['anexo1', 'anexo2', 'estadio1', 'estadio2']);
    expect(CAMPOS.map((c) => c.nombre)).toEqual(['Anexo 1', 'Anexo 2', 'Estadio 1', 'Estadio 2']);
  });

  it('liga de 4 con 2 campos: los 6 partidos sin turnos seguidos y finales Oro 1º–2º y Plata 3º–4º', () => {
    const r = generarCategoria(categoria());
    const grupos = r.turnos.filter((t) => t.fase === 'grupos');
    expect(grupos[0].hora).toBe('09:00');
    expect(grupos[1].hora).toBe('09:25');
    const parejas = partidosDeFase(r, 'grupos').map(pareja);
    expect(parejas).toHaveLength(6);
    expect(new Set(parejas).size).toBe(6);
    sinTurnosSeguidos(r);

    const finales = r.turnos[r.turnos.length - 1];
    expect(finales.fase).toBe('finales');
    expect(finales.partidos).toEqual([
      { campo: 'anexo1', local: '1º', visitante: '2º', etiqueta: 'ORO' },
      { campo: 'anexo2', local: '3º', visitante: '4º', etiqueta: 'PLATA' }
    ]);
  });

  it('2 grupos de 4 con 2 campos: 6 turnos de grupos, alternando A y B, sin turnos seguidos', () => {
    const r = generarCategoria(categoria({
      formato: 'grupos', final_oro: false, final_plata: false,
      equipos: [...inscripciones(['A1', 'A2', 'A3', 'A4'], 'A'), ...inscripciones(['B1', 'B2', 'B3', 'B4'], 'B')]
    }));
    expect(r.turnos).toHaveLength(6);
    expect(partidosDeFase(r, 'grupos')).toHaveLength(12);
    sinTurnosSeguidos(r);
  });

  for (const [desc, extra] of [
    ['liga de 5 con 2 campos', { equipos: inscripciones(['E1', 'E2', 'E3', 'E4', 'E5']) }],
    ['liga de 6 con 4 campos', { campos: ['anexo1', 'anexo2', 'estadio1', 'estadio2'], equipos: inscripciones(['E1', 'E2', 'E3', 'E4', 'E5', 'E6']) }],
    ['liga de 3 con 1 campo', { campos: ['anexo1'], equipos: inscripciones(['E1', 'E2', 'E3']), final_plata: false }],
    ['grupos 4 + 3 con 2 campos', { formato: 'grupos', equipos: [...inscripciones(['A1', 'A2', 'A3', 'A4'], 'A'), ...inscripciones(['B1', 'B2', 'B3'], 'B')] }],
    ['grupos 5 + 5 con 4 campos', { formato: 'grupos', campos: ['anexo1', 'anexo2', 'estadio1', 'estadio2'], equipos: [...inscripciones(['A1', 'A2', 'A3', 'A4', 'A5'], 'A'), ...inscripciones(['B1', 'B2', 'B3', 'B4', 'B5'], 'B')] }]
  ]) {
    it(`${desc}: todos los partidos y ningún equipo juega dos turnos seguidos`, () => {
      const cat = categoria(extra);
      const r = generarCategoria(cat);
      const porGrupo = cat.formato === 'grupos'
        ? ['A', 'B'].map((g) => cat.equipos.filter((e) => e.grupo === g).length)
        : [cat.equipos.length];
      const esperados = porGrupo.reduce((n, k) => n + (k * (k - 1)) / 2, 0);
      expect(partidosDeFase(r, 'grupos')).toHaveLength(esperados);
      sinTurnosSeguidos(r);
      sinEquiposRepetidosPorTurno(r);
    });
  }

  it('liga de 5: 10 partidos, sin equipos repetidos en un turno y sin "descansa"', () => {
    const r = generarCategoria(categoria({ equipos: inscripciones(['E1', 'E2', 'E3', 'E4', 'E5']), final_oro: false, final_plata: false }));
    const partidos = partidosDeFase(r, 'grupos');
    expect(partidos).toHaveLength(10);
    expect(new Set(partidos.map(pareja)).size).toBe(10);
    partidos.forEach((p) => { expect(p.local).toBeTruthy(); expect(p.visitante).toBeTruthy(); });
    sinEquiposRepetidosPorTurno(r);
  });

  it('2 grupos de 4 con semifinales, Oro y Plata', () => {
    const r = generarCategoria(categoria({
      formato: 'grupos',
      semifinales: true,
      equipos: [...inscripciones(['A1', 'A2', 'A3', 'A4'], 'A'), ...inscripciones(['B1', 'B2', 'B3', 'B4'], 'B')]
    }));
    const grupos = partidosDeFase(r, 'grupos');
    expect(grupos).toHaveLength(12);
    expect(grupos.filter((p) => p.grupo === 'A')).toHaveLength(6);
    sinEquiposRepetidosPorTurno(r);

    expect(partidosDeFase(r, 'semifinales')).toEqual([
      { campo: 'anexo1', local: '1º A', visitante: '2º B', etiqueta: 'SF1' },
      { campo: 'anexo2', local: '1º B', visitante: '2º A', etiqueta: 'SF2' }
    ]);
    expect(partidosDeFase(r, 'finales')).toEqual([
      { campo: 'anexo1', local: 'Ganador SF1', visitante: 'Ganador SF2', etiqueta: 'ORO' },
      { campo: 'anexo2', local: 'Perdedor SF1', visitante: 'Perdedor SF2', etiqueta: 'PLATA' }
    ]);
    const fases = r.turnos.map((t) => t.fase);
    expect(fases.lastIndexOf('grupos')).toBeLessThan(fases.indexOf('semifinales'));
    expect(fases.lastIndexOf('semifinales')).toBeLessThan(fases.indexOf('finales'));
  });

  it('descanso de 10 minutos antes de semifinales y antes de finales (en lugar del descanso normal)', () => {
    const r = generarCategoria(categoria({
      formato: 'grupos', semifinales: true,
      equipos: [...inscripciones(['A1', 'A2', 'A3', 'A4'], 'A'), ...inscripciones(['B1', 'B2', 'B3', 'B4'], 'B')]
    }));
    const horas = (fase) => r.turnos.filter((t) => t.fase === fase).map((t) => t.hora);
    expect(horas('grupos')).toEqual(['09:00', '09:25', '09:50', '10:15', '10:40', '11:05']);
    // Último de grupos acaba 11:25 → +10' → semifinales 11:35, acaban 11:55 → +10' → finales 12:05.
    expect(horas('semifinales')).toEqual(['11:35']);
    expect(horas('finales')).toEqual(['12:05']);
    expect(r.horaFinReal).toBe('12:25');
  });

  it('sin semifinales, las finales empiezan 10 minutos después del último partido', () => {
    const r = generarCategoria(categoria({ campos: ['anexo1'], equipos: inscripciones(['E1', 'E2']), final_plata: false }));
    // Un partido de grupos 09:00–09:20 → final 09:30.
    expect(r.turnos.map((t) => [t.fase, t.hora])).toEqual([['grupos', '09:00'], ['finales', '09:30']]);
  });

  it('grupos sin semifinales: Oro 1º A – 1º B y Plata 2º A – 2º B', () => {
    const r = generarCategoria(categoria({
      formato: 'grupos',
      equipos: [...inscripciones(['A1', 'A2', 'A3'], 'A'), ...inscripciones(['B1', 'B2', 'B3'], 'B')]
    }));
    expect(partidosDeFase(r, 'semifinales')).toEqual([]);
    expect(partidosDeFase(r, 'finales')).toEqual([
      { campo: 'anexo1', local: '1º A', visitante: '1º B', etiqueta: 'ORO' },
      { campo: 'anexo2', local: '2º A', visitante: '2º B', etiqueta: 'PLATA' }
    ]);
  });

  it('con un solo campo: semifinales en turnos distintos y Plata antes que Oro', () => {
    const r = generarCategoria(categoria({
      campos: ['estadio1'],
      formato: 'grupos',
      semifinales: true,
      equipos: [...inscripciones(['A1', 'A2'], 'A'), ...inscripciones(['B1', 'B2'], 'B')]
    }));
    r.turnos.forEach((t) => expect(t.partidos).toHaveLength(1));
    const eliminatorias = r.turnos.filter((t) => t.fase !== 'grupos').map((t) => t.partidos[0].etiqueta);
    expect(eliminatorias).toEqual(['SF1', 'SF2', 'PLATA', 'ORO']);
    expect(r.turnos.every((t) => t.partidos[0].campo === 'estadio1')).toBe(true);
  });

  it('en liga ignora semifinales aunque estén marcadas', () => {
    const r = generarCategoria(categoria({ semifinales: true }));
    expect(partidosDeFase(r, 'semifinales')).toEqual([]);
  });

  it('excedeHoraFin solo si la hora de final es anterior al final real', () => {
    expect(generarCategoria(categoria({ hora_fin: '10:00:00' })).excedeHoraFin).toBe(true);
    expect(generarCategoria(categoria({ hora_fin: '12:00' })).excedeHoraFin).toBe(false);
    expect(generarCategoria(categoria({ hora_fin: null })).excedeHoraFin).toBe(false);
  });

  it('es determinista', () => {
    const datos = categoria({ equipos: inscripciones(['E1', 'E2', 'E3', 'E4', 'E5', 'E6']) });
    expect(generarCategoria(datos)).toEqual(generarCategoria(datos));
  });

  it('PALMA A y PALMA B juegan entre sí como participantes distintos', () => {
    const r = generarCategoria(categoria({ equipos: inscripciones(['PALMA A', 'PALMA B', 'Posadas']), final_oro: false, final_plata: false }));
    expect(partidosDeFase(r, 'grupos').map(pareja)).toContain('PALMA A|PALMA B');
  });

  it('usa los campos en el orden fijo aunque se elijan desordenados', () => {
    const r = generarCategoria(categoria({ campos: ['estadio2', 'anexo1'] }));
    expect(r.turnos[0].partidos.map((p) => p.campo)).toEqual(['anexo1', 'estadio2']);
  });

  it('esHoraValida solo acepta HH:MM', () => {
    for (const h of ['00:00', '09:05', '23:59']) expect(esHoraValida(h)).toBe(true);
    for (const h of ['', '9:05', '24:00', '12:60', '12:3_', 'ab:cd', null]) expect(esHoraValida(h)).toBe(false);
  });
});
