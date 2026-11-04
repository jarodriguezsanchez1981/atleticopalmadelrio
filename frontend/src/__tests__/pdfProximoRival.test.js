import { describe, it, expect } from 'vitest';
import { valorPdf, anchosColumnas, celdasCabecera, nombreFicheroPdf, crearDocProximoRival } from '../utils/pdfProximoRival';
import { construirHojaEstadistica } from '../utils/excelEstadisticas';
import { METRICAS_SANCIONES, METRICAS_GOLES } from '../utils/estadisticasMetricas';

const JUGADORES = Array.from({ length: 60 }, (_, i) => ({
  jugador: `Jugador Número ${i + 1}`, dorsal: i + 1, goles: 60 - i, porcentaje_goles_partido: 33.33, tarjetas_amarillas: i % 3
}));

describe('pdfProximoRival', () => {
  it('formatea los números como en pantalla', () => {
    expect(valorPdf(33.33, 'porcentaje')).toBe('33,3 %');
    expect(valorPdf(1.5, 'decimal')).toBe('1,50');
    expect(valorPdf(67.5, 'unDecimal')).toBe('67,5');
    expect(valorPdf(null, 'porcentaje')).toBe('—');
    expect(valorPdf(null, null)).toBe('');
    expect(valorPdf(7, null)).toBe('7');
  });

  it('con Dorsal: columnas Dorsal y nombre fijas y el resto repartido', () => {
    const hoja = construirHojaEstadistica({ metricas: METRICAS_GOLES, filas: JUGADORES, soloGrupo: 'total', columnaDorsal: true });
    expect(hoja.cabeceras[0].slice(0, 2)).toEqual(['Dorsal', 'Jugador']);
    expect(hoja.filas[0].slice(0, 2)).toEqual([1, 'Jugador Número 1']);
    const anchos = anchosColumnas(hoja, 277);
    expect(anchos.slice(0, 2)).toEqual([11, 46]);
    expect(anchos.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(277.001);
  });

  it('cabecera con subgrupos: cada celda combinada se dibuja una sola vez', () => {
    const hoja = construirHojaEstadistica({ metricas: METRICAS_SANCIONES, filas: [], soloGrupo: 'total', columnaDorsal: true });
    const celdas = celdasCabecera(hoja);
    expect(celdas.filter((c) => c.texto === 'Dorsal')).toEqual([{ fila: 0, col: 0, filaFin: 1, colFin: 0, texto: 'Dorsal' }]);
    // Ninguna celda tapa a otra.
    const ocupadas = new Set();
    for (const c of celdas) {
      for (let f = c.fila; f <= c.filaFin; f++) for (let k = c.col; k <= c.colFin; k++) {
        expect(ocupadas.has(`${f},${k}`)).toBe(false);
        ocupadas.add(`${f},${k}`);
      }
    }
    expect(ocupadas.size).toBe(hoja.cabeceras.length * hoja.cabeceras[0].length);
  });

  it('nombre del fichero sin tildes ni espacios', () => {
    expect(nombreFicheroPdf('Alevín B', 8)).toBe('Proximo_Rival_Alevin_B_J8.pdf');
  });

  it('una página por sección y las tablas largas siguen en otra página', () => {
    const hoja = construirHojaEstadistica({ metricas: METRICAS_GOLES, filas: JUGADORES, soloGrupo: 'total', sortField: 'goles', columnaDorsal: true });
    const vacia = construirHojaEstadistica({ metricas: METRICAS_SANCIONES, filas: [], soloGrupo: 'local', columnaDorsal: true });
    const datos = (secciones) => ({
      titulo: 'Alevin B / 2026/2027',
      partido: { jornada: 8, textoFecha: 'Viernes, 6 de noviembre de 2026', lugar: 'fuera',
        local: { nombre: 'C.D. GRANADAL FIGUEROA' }, visitante: { nombre: 'PALMA DEL RIO ATLETICO C.F.' }, rival: 'C.D. GRANADAL FIGUEROA' },
      info: 'Con actas de las jornadas 1 a 7.',
      secciones
    });
    const goles = { titulo: 'Goles', descripcion: 'Goles del rival.', leyenda: 'Goles: goles marcados', tablas: [{ subtitulo: 'Total · Jugadores', hoja }] };
    const sanciones = { titulo: 'Sanciones', descripcion: '', leyenda: '', tablas: [{ subtitulo: 'Local · Jugadores', hoja: vacia, textoVacio: 'Nadie.' }] };
    // Las 60 filas de Goles no caben en una página; Sanciones empieza en otra.
    const soloGoles = crearDocProximoRival(datos([goles])).getNumberOfPages();
    expect(soloGoles).toBeGreaterThan(1);
    expect(crearDocProximoRival(datos([goles, sanciones])).getNumberOfPages()).toBe(soloGoles + 1);
  });
});
