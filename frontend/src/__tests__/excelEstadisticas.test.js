import { describe, it, expect, vi, afterEach } from 'vitest';
import ExcelJS from 'exceljs';
import { construirHojaEstadistica, construirHojaSimple, nombreHoja, nombreFicheroExcel, descargarExcel } from '../utils/excelEstadisticas.js';
import { METRICAS_SANCIONES, METRICAS_CONVOCATORIAS } from '../utils/estadisticasMetricas.js';

describe('excelEstadisticas · construirHojaEstadistica', () => {
  const metricas = [
    { campo: 'partidos', titulo: 'Partidos' },
    { campo: 'goles', titulo: 'Goles' },
    { campo: 'porcentaje', titulo: '% de sus\ngoles', porcentaje: true, soloLados: true },
    { campo: 'media', titulo: 'Media', decimal: true }
  ];
  const filas = [
    { jugador: 'Ana', partidos: 3, goles: 1, goles_local: 1, media: 0.33 },
    { jugador: 'Luis', partidos: 4, goles: 5, goles_local: 2, media: 1.25 }
  ];

  it('con un solo grupo: una fila de cabecera, orden por sortField y formatos', () => {
    const h = construirHojaEstadistica({ metricas, filas, soloGrupo: 'total', sortField: 'goles' });
    // % de sus goles solo va en Local / Visitante.
    expect(h.cabeceras).toEqual([['Jugador', 'Partidos', 'Goles', 'Media']]);
    expect(h.combinadas).toEqual([]);
    expect(h.formatos).toEqual([null, null, null, 'decimal']);
    expect(h.filas).toEqual([['Luis', 4, 5, 1.25], ['Ana', 3, 1, 0.33]]);
  });

  it('en Local ordena por el campo del lado y usa sus campos', () => {
    const h = construirHojaEstadistica({ metricas, filas, soloGrupo: 'local', sortField: 'goles' });
    expect(h.cabeceras[0]).toEqual(['Jugador', 'Partidos', 'Goles', '% de sus goles', 'Media']);
    expect(h.formatos[3]).toBe('porcentaje');
    expect(h.filas.map((f) => f[0])).toEqual(['Luis', 'Ana']);
    expect(h.filas[1]).toEqual(['Ana', null, 1, null, null]);
  });

  it('con subgrupos: dos filas, el subgrupo combinado y las sueltas en vertical', () => {
    const h = construirHojaEstadistica({ metricas: METRICAS_SANCIONES, filas: [], soloGrupo: 'total' });
    expect(h.cabeceras).toHaveLength(2);
    expect(h.cabeceras[0].slice(0, 3)).toEqual(['Jugador', 'Partidos', 'Amarillas']);
    expect(h.cabeceras[1].slice(0, 4)).toEqual(['', '', 'Total', 'Tit.']);
    expect(h.combinadas).toContainEqual([0, 0, 1, 0]);
    expect(h.combinadas).toContainEqual([0, 1, 1, 1]);
    const amarillas = METRICAS_SANCIONES.filter((m) => m.subgrupo === 'Amarillas').length;
    expect(h.combinadas).toContainEqual([0, 2, 0, 2 + amarillas - 1]);
  });

  it('sin soloGrupo: fila de grupos Total / Local / Visitante combinada', () => {
    const h = construirHojaEstadistica({ metricas: METRICAS_CONVOCATORIAS, filas: [] });
    const n = METRICAS_CONVOCATORIAS.length;
    expect(h.cabeceras).toHaveLength(2);
    expect(h.cabeceras[0][1]).toBe('Total');
    expect(h.cabeceras[0][1 + n]).toBe('Local');
    expect(h.cabeceras[0][1 + 2 * n]).toBe('Visitante');
    expect(h.combinadas).toContainEqual([0, 1, 0, n]);
    expect(h.cabeceras[1]).toHaveLength(1 + 3 * n);
  });

  it('las hojas se pueden escribir en un libro de exceljs', async () => {
    const h = construirHojaEstadistica({ metricas: METRICAS_SANCIONES, filas: [], soloGrupo: 'local' });
    const libro = new ExcelJS.Workbook();
    const ws = libro.addWorksheet('Jugadores Local');
    h.cabeceras.forEach((c) => ws.addRow(c));
    for (const [f1, c1, f2, c2] of h.combinadas) ws.mergeCells(f1 + 1, c1 + 1, f2 + 1, c2 + 1);
    const buffer = await libro.xlsx.writeBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  });
});

describe('excelEstadisticas · utilidades', () => {
  it('construirHojaSimple saca las columnas pedidas', () => {
    const h = construirHojaSimple({ columnas: [{ campo: 'a', titulo: 'A' }, { campo: 'b', titulo: 'B' }], filas: [{ a: 1 }] });
    expect(h.cabeceras).toEqual([['A', 'B']]);
    expect(h.filas).toEqual([[1, null]]);
  });

  it('nombreHoja quita caracteres prohibidos, corta a 31 y no repite', () => {
    const usados = new Set();
    expect(nombreHoja('Senior A / 2026', usados)).toBe('Senior A   2026');
    expect(nombreHoja('x'.repeat(40), usados)).toHaveLength(31);
    expect(nombreHoja('Equipo Total', usados)).toBe('Equipo Total');
    expect(nombreHoja('Equipo Total', usados)).toBe('Equipo Total 2');
  });

  it('nombreFicheroExcel sin tildes ni barras y con la fecha', () => {
    expect(nombreFicheroExcel('Estadísticas Goles', 'Senior A / 2026/2027'))
      .toMatch(/^estadisticas-goles-senior-a-2026-2027-\d{4}-\d{2}-\d{2}$/);
  });
});

describe('excelEstadisticas · descargarExcel', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('genera un libro con una hoja por tabla, cabeceras combinadas y formatos', async () => {
    let contenido = null;
    vi.stubGlobal('Blob', class { constructor(partes) { contenido = partes[0]; } });
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const filas = [{ id_jugador: 1, jugador: 'Ana', partidos: 2, tarjetas_amarillas: 1, media: 0.5 }];
    await descargarExcel('prueba', [
      { nombre: 'Jugadores Total', titulo: 'Sanciones', ...construirHojaEstadistica({ metricas: METRICAS_SANCIONES, filas, soloGrupo: 'total' }) },
      { nombre: 'Equipo Total', titulo: 'Equipo', ...construirHojaEstadistica({
        metricas: [{ campo: 'media', titulo: 'Media', decimal: true }], filas, soloGrupo: 'total' }) }
    ]);
    expect(click).toHaveBeenCalled();

    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(contenido);
    expect(libro.worksheets.map((w) => w.name)).toEqual(['Jugadores Total', 'Equipo Total']);
    const ws = libro.getWorksheet('Jugadores Total');
    expect(ws.getCell('A1').value).toBe('Sanciones');
    expect(ws.getCell('A3').value).toBe('Jugador');
    expect(ws.getCell('A4').isMerged).toBe(true);
    expect(ws.getCell('C3').value).toBe('Amarillas');
    expect(ws.getCell('C4').value).toBe('Total');
    expect(ws.getCell('A5').value).toBe('Ana');
    expect(ws.getCell('C5').value).toBe(1);
    const eq = libro.getWorksheet('Equipo Total');
    expect(eq.getCell('B4').value).toBe(0.5);
    expect(eq.getCell('B4').numFmt).toBe('0.00');
  });
});
