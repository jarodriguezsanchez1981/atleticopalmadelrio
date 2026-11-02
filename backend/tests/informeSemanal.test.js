import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
import { Temporada, Plantilla, Partido, Clasificacion, Sancion, PartidoGol, PartidoGolContra, PartidoTarjeta, Jugador } from './helpers/models.js';

const require = createRequire(import.meta.url);
const { finDeSemana, ultimoLunes, construirInforme, htmlInforme } = require('../src/utils/informeSemanal.js');

const F7 = 1;
const F11 = 2;
const LIGA_RFAF = { codigo_primaria: '1', codigo_grupo: '2', codigo_competicion: '3' };
const plantilla = (id, nombre, orden, idTipo, codigos = LIGA_RFAF) => ({
  id, ...codigos, categoria: { id: id * 10, nombre, orden, id_tipofutbol: idTipo }
});
// La BD guarda la hora española; Sequelize la devuelve como si fuera UTC.
const partido = (id, idPlantilla, fecha, extra = {}) => ({
  id, id_plantilla: idPlantilla, jornada: 7, fecha: new Date(`${fecha}Z`), resultado: '2-1', suspendido: false,
  equipoLocal: { id: 1, nombre: 'PALMA DEL RIO ATLETICO C.F.', escudo: 'data:image/png;base64,UEFMTUE=' },
  equipoVisitante: { id: 2, nombre: 'RIVAL', escudo: null }, ...extra
});

describe('informeSemanal · fechas', () => {
  it('finDeSemana: viernes a domingo anteriores al lunes', () => {
    expect(finDeSemana('2026-11-02')).toEqual({ desde: '2026-10-30', hasta: '2026-11-01' });
    expect(finDeSemana('2026-03-30')).toEqual({ desde: '2026-03-27', hasta: '2026-03-29' });
  });

  it('ultimoLunes: el lunes de esta semana en hora española', () => {
    expect(ultimoLunes(new Date('2026-11-04T10:00:00Z'))).toBe('2026-11-02');
    expect(ultimoLunes(new Date('2026-11-02T08:00:00Z'))).toBe('2026-11-02');
    // Domingo 23:30 UTC = lunes 00:30 en España.
    expect(ultimoLunes(new Date('2026-11-01T23:30:00Z'))).toBe('2026-11-02');
  });
});

describe('informeSemanal · construirInforme', () => {
  beforeEach(() => {
    for (const m of [Temporada, Plantilla, Partido, Clasificacion, Sancion, PartidoGol, PartidoGolContra, PartidoTarjeta, Jugador]) {
      m.findAll.mockReset();
      m.findOne.mockReset();
    }
    Temporada.findOne.mockResolvedValue({ id: 3 });
    Plantilla.findAll.mockResolvedValue([
      plantilla(2, 'Infantil A', 14, F11),
      plantilla(1, 'Benjamin A', 7, F7),
      plantilla(4, 'Alevin A', 11, F7),
      plantilla(5, 'Bebe', 1, F7, { codigo_primaria: '1', codigo_grupo: null, codigo_competicion: null }),
      plantilla(6, 'Prebenjamin A', 4, F7)
    ]);
    Partido.findAll.mockResolvedValue([
      partido(10, 1, '2026-10-30T00:00:00'),
      partido(11, 2, '2026-11-01T23:59:00', { resultado: null }),
      partido(12, 1, '2026-11-02T10:00:00'), // lunes: fuera del fin de semana
      partido(13, 2, '2026-10-31T12:00:00', { jornada: null }) // amistoso: no cuenta
    ]);
    Clasificacion.findAll.mockResolvedValue([
      { id_plantilla: 1, jornada: 6, posicion: 5, puntos: 12, es_palma: true },
      { id_plantilla: 1, jornada: 7, posicion: 3, puntos: 18, es_palma: true },
      { id_plantilla: 2, jornada: 7, posicion: 1, puntos: 21, es_palma: true }
    ]);
    Jugador.findAll.mockResolvedValue([
      { id: 7, nombre: 'Ana', apellidos: 'López' },
      { id: 8, nombre: 'Luis', apellidos: 'Pérez' }
    ]);
    PartidoGol.findAll.mockResolvedValue([
      { id_partido: 10, id_jugador: 7, minuto: 70, tipo: 'penalti' },
      { id_partido: 10, id_jugador: 8, minuto: 30, tipo: 'normal' },
      { id_partido: 10, id_jugador: 7, minuto: 12, tipo: 'normal' }
    ]);
    PartidoGolContra.findAll.mockResolvedValue([{ id_partido: 10, minuto: 55, tipo: 'normal', propia: false }]);
    // Partido 10: tarjetas del acta (con minuto). Partido 11: sin acta, solo la tabla Sanciones.
    PartidoTarjeta.findAll.mockResolvedValue([
      { id_partido: 10, id_jugador: 8, tipo: 'roja', minuto: 88 },
      { id_partido: 10, id_jugador: 7, tipo: 'amarilla', minuto: 40 }
    ]);
    Sancion.findAll.mockResolvedValue([
      { id_partido: 10, amarilla: 1, roja: 0, jugador: { nombre: 'Ana', apellidos: 'López' } },
      { id_partido: 11, amarilla: 2, roja: 0, jugador: { nombre: 'Eva', apellidos: 'Ruiz' } },
      { id_partido: 11, amarilla: 0, roja: 0, jugador: { nombre: 'Sin', apellidos: 'Tarjeta' } }
    ]);
  });

  it('solo plantillas de la temporada actual', async () => {
    await construirInforme('2026-11-02');
    expect(Plantilla.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { id_temporada: 3 } }));
  });

  it('agrupa en Fútbol 7 y Fútbol 11, por orden de categoría, con partido, puesto, goles y tarjetas', async () => {
    const d = await construirInforme('2026-11-02');
    expect(d).toMatchObject({ lunes: '2026-11-02', desde: '2026-10-30', hasta: '2026-11-01', hayJornada: true });
    expect(d.bloques.map((b) => b.tipo)).toEqual(['Fútbol 7', 'Fútbol 11']);
    // Sin liga de RFAF configurada (Bebe) no sale.
    expect(d.bloques[0].categorias.map((c) => c.categoria)).toEqual(['Prebenjamin A', 'Benjamin A', 'Alevin A']);

    const benjamin = d.bloques[0].categorias[1];
    expect(benjamin.partidos).toEqual([{
      local: 'PALMA DEL RIO ATLETICO C.F.', visitante: 'RIVAL', idLocal: 1, idVisitante: 2,
      fecha: new Date('2026-10-30T00:00:00Z'), resultado: '2-1', suspendido: false,
      golesLocal: 2, golesVisitante: 1,
      // Goles (de los dos equipos) y tarjetas del PALMA, por minuto.
      eventos: [
        { minuto: 12, tipo: 'gol', jugador: 'Ana López', penalti: false },
        { minuto: 30, tipo: 'gol', jugador: 'Luis Pérez', penalti: false },
        { minuto: 40, tipo: 'amarilla', jugador: 'Ana López' },
        { minuto: 55, tipo: 'gol_rival', equipo: 'RIVAL', penalti: false, propia: false },
        { minuto: 70, tipo: 'gol', jugador: 'Ana López', penalti: true },
        { minuto: 88, tipo: 'roja', jugador: 'Luis Pérez' }
      ]
    }]);
    expect(benjamin.puesto).toEqual({ posicion: 3, puntos: 18, jornada: 7 });
    // Escudos (data URL) de los equipos que salen, por id.
    expect(d.escudos).toEqual({ 1: 'data:image/png;base64,UEFMTUE=' });

    const infantil = d.bloques[1].categorias[0];
    expect(infantil.partidos).toHaveLength(1);
    expect(infantil.partidos[0]).toMatchObject({ resultado: null, golesLocal: null, golesVisitante: null });
    // Sin tarjetas en el acta: las de Sanciones, sin minuto (una por tarjeta).
    expect(infantil.partidos[0].eventos).toEqual([
      { minuto: null, tipo: 'amarilla', jugador: 'Eva Ruiz' },
      { minuto: null, tipo: 'amarilla', jugador: 'Eva Ruiz' }
    ]);

    const alevin = d.bloques[0].categorias[2];
    expect(alevin.partidos).toEqual([]);
    expect(d.bloques[0].categorias[0].puesto).toBeNull();
  });

  it('hayJornada false si no hay partidos de liga ese fin de semana', async () => {
    Partido.findAll.mockResolvedValue([partido(12, 1, '2026-11-02T10:00:00')]);
    const d = await construirInforme('2026-11-02');
    expect(d.hayJornada).toBe(false);
  });

  it('sin temporada actual, sin categorías ni jornada', async () => {
    Temporada.findOne.mockResolvedValue(null);
    const d = await construirInforme('2026-11-02');
    expect(d.hayJornada).toBe(false);
    expect(d.bloques.every((b) => b.categorias.length === 0)).toBe(true);
  });
});

describe('informeSemanal · htmlInforme', () => {
  const partidoBase = { idLocal: 1, idVisitante: 2, golesLocal: null, golesVisitante: null, eventos: [] };
  const datos = {
    lunes: '2026-11-02', desde: '2026-10-30', hasta: '2026-11-01', hayJornada: true,
    escudos: { 1: 'data:image/png;base64,UEFMTUE=' },
    bloques: [
      { tipo: 'Fútbol 7', categorias: [
        { categoria: 'Benjamin A', puesto: { posicion: 3, puntos: 18, jornada: 7 },
          partidos: [{ ...partidoBase, local: '<b>X</b>', visitante: 'RIVAL', fecha: new Date('2026-10-31T10:30:00Z'),
            resultado: '3-1', suspendido: false, golesLocal: 3, golesVisitante: 1,
            eventos: [
              { minuto: 12, tipo: 'gol', jugador: 'Ana López', penalti: false },
              { minuto: 40, tipo: 'amarilla', jugador: 'Ana López' },
              { minuto: 55, tipo: 'gol_rival', equipo: 'RIVAL', penalti: false, propia: true },
              { minuto: 70, tipo: 'gol', jugador: 'Ana López', penalti: true },
              { minuto: null, tipo: 'roja', jugador: 'Luis Pérez' }
            ] }] },
        { categoria: 'Alevin A', puesto: null, partidos: [] }
      ] },
      { tipo: 'Fútbol 11', categorias: [
        { categoria: 'Infantil A', puesto: null,
          partidos: [{ ...partidoBase, local: 'A', visitante: 'B', fecha: new Date('2026-11-01T12:00:00Z'), resultado: null, suspendido: true }] },
        { categoria: 'Cadete A', puesto: null,
          partidos: [{ ...partidoBase, local: 'A', visitante: 'B', fecha: new Date('2026-11-01T12:00:00Z'), resultado: null, suspendido: false }] }
      ] }
    ]
  };

  it('asunto con el viernes del fin de semana y contenido de cada caso', () => {
    const { asunto, html } = htmlInforme(datos);
    expect(asunto).toBe('Informe semanal · fin de semana del 30/10/2026');
    for (const texto of ['Fútbol 7', 'Fútbol 11', 'Benjamin A', 'Sin partido', '3º con 18 puntos (jornada 7)',
      'Sin clasificación', 'Suspendido', 'Sin resultado', '31/10/2026 10:30']) {
      expect(html).toContain(texto);
    }
  });

  it('cada equipo en su fila con sus goles, y debajo los goles y tarjetas por minuto', () => {
    const { html } = htmlInforme(datos);
    const sinEtiquetas = html.replace(/<[^>]+>/g, '|').replace(/\s+/g, ' ');
    expect(sinEtiquetas).toMatch(/&lt;b&gt;X&lt;\/b&gt;\|[| ]*3\|/);
    expect(sinEtiquetas).toMatch(/RIVAL\|[| ]*1\|/);
    const orden = ["12' ⚽ Ana López", "40' ", "55' ⚽ RIVAL (pp)", "70' ⚽ Ana López (p)", 'Luis Pérez'];
    let desde = 0;
    for (const texto of orden) {
      const i = sinEtiquetas.indexOf(texto, desde);
      expect(i, texto).toBeGreaterThanOrEqual(0);
      desde = i;
    }
    expect(html).toContain('title="Tarjeta amarilla"');
    expect(html).toContain('title="Tarjeta roja"');
  });

  it('escudos: data URL por defecto (vista previa) o la src que se indique (email con cid); sin escudo, sin imagen', () => {
    expect(htmlInforme(datos).html).toContain('src="data:image/png;base64,UEFMTUE="');
    const { html } = htmlInforme(datos, { srcEscudo: (id) => (datos.escudos[id] ? `cid:escudo-${id}` : null) });
    expect(html).toContain('src="cid:escudo-1"');
    expect(html).not.toContain('cid:escudo-2');
  });

  it('cabecera de cada categoría con su nombre y la clasificación, sin línea aparte al final', () => {
    const { html } = htmlInforme(datos);
    const sinEtiquetas = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
    expect(sinEtiquetas).toContain('Benjamin A · 3º con 18 puntos (jornada 7)');
    expect(sinEtiquetas).toContain('Alevin A · Sin clasificación');
    expect(html).not.toContain('Clasificación:');
  });

  it('escapa los textos de la BD', () => {
    const { html } = htmlInforme(datos);
    expect(html).toContain('&lt;b&gt;X&lt;/b&gt;');
    expect(html).not.toContain('<b>X</b>');
  });
});
