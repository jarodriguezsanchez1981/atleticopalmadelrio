import { describe, it, expect } from 'vitest';
import { jsPDF } from 'jspdf';
import { construirHojasTorneo, crearDocTorneo, dibujarTorneo } from '../utils/pdfGenerarTorneo';

const inscripciones = (nombres, grupo = null) => nombres.map((nombre) => ({ nombre, grupo }));

function torneo(categorias) {
  return { nombre: 'Torneo de Navidad 2026', fecha: '2026-12-27', categorias };
}

const catGrupos = {
  categoria: { nombre: 'Benjamín A' },
  hora_inicio: '09:00:00',
  hora_fin: '13:30:00',
  duracion_min: 20,
  descanso_min: 5,
  campos: ['anexo1', 'anexo2'],
  formato: 'grupos',
  semifinales: true,
  final_oro: true,
  final_plata: true,
  equipos: [...inscripciones(['A1', 'A2', 'A3', 'A4'], 'A'), ...inscripciones(['B1', 'B2', 'B3', 'B4'], 'B')]
};

const catLiga = {
  categoria: { nombre: 'Prebenjamín B' },
  hora_inicio: '16:00',
  hora_fin: null,
  duracion_min: 15,
  descanso_min: 0,
  campos: ['estadio1'],
  formato: 'liga',
  semifinales: false,
  final_oro: false,
  final_plata: false,
  equipos: inscripciones(['X', 'Y', 'Z'])
};

// Celda del horario: texto o { lineas: [{ texto, equipo? }] } (partido con escudos).
const textoCelda = (c) => (typeof c === 'string' ? c : c.lineas.map((l) => l.texto).join(' '));
const ESCUDO_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const dato = (hoja, etiqueta) => hoja.datos.find(([e]) => e === etiqueta)?.[1];
const fases = (hoja) => hoja.filas.filter((f) => !Array.isArray(f)).map((f) => f.fase);

describe('pdfGenerarTorneo · construirHojasTorneo', () => {
  it('una hoja por categoría con título y subtítulo', () => {
    const hojas = construirHojasTorneo(torneo([catGrupos, catLiga]));
    expect(hojas).toHaveLength(2);
    expect(hojas[0].titulo).toBe('Torneo de Navidad 2026');
    expect(hojas[0].subtitulo).toContain('Benjamín A');
    expect(hojas[0].subtitulo).toContain('(Fútbol 7)');
  });

  it('datos: fecha, horario, lugar y duración', () => {
    const [hoja, liga] = construirHojasTorneo(torneo([catGrupos, catLiga]));
    expect(dato(hoja, 'Fecha')).toBe('27/12/2026');
    expect(dato(hoja, 'Horario')).toBe('09:00 – 13:30');
    expect(dato(hoja, 'Lugar')).toBe('Anexo 1, Anexo 2');
    expect(dato(hoja, 'Partidos')).toBe("20' + 5' descanso");
    expect(dato(liga, 'Horario')).toBe('16:00');
    expect(dato(liga, 'Partidos')).toBe("15'");
  });

  it('columnas: Hora y los campos elegidos', () => {
    const [hoja, liga] = construirHojasTorneo(torneo([catGrupos, catLiga]));
    expect(hoja.columnas).toEqual(['Hora', 'Anexo 1', 'Anexo 2']);
    expect(liga.columnas).toEqual(['Hora', 'Estadio 1']);
  });

  it('grupos con sus equipos o lista única en todos contra todos', () => {
    const [hoja, liga] = construirHojasTorneo(torneo([catGrupos, catLiga]));
    expect(hoja.grupos).toEqual({ A: ['A1', 'A2', 'A3', 'A4'], B: ['B1', 'B2', 'B3', 'B4'] });
    expect(liga.grupos).toEqual({ todos: ['X', 'Y', 'Z'] });
  });

  it('filas separadas por fase, solo las que tienen partidos', () => {
    const [hoja, liga] = construirHojasTorneo(torneo([catGrupos, catLiga]));
    expect(fases(hoja)).toEqual(['Fase de grupos', 'Semifinales', 'Finales']);
    expect(fases(liga)).toEqual(['Todos contra todos']);
  });

  it('celdas con grupo entre paréntesis y prefijos de eliminatoria', () => {
    const [hoja] = construirHojasTorneo(torneo([catGrupos]));
    const celdas = hoja.filas.filter(Array.isArray);
    expect(celdas[0][0]).toBe('09:00');
    expect(textoCelda(celdas[0][1])).toMatch(/\((A|B)\)$/);
    const textos = celdas.flat().map(textoCelda);
    expect(textos).toContain('SF1: 1º A – 2º B');
    expect(textos).toContain('ORO: Ganador SF1 – Ganador SF2');
    expect(textos).toContain('PLATA: Perdedor SF1 – Perdedor SF2');
  });

  it('los partidos de grupos llevan cada equipo en su línea con su escudo; las eliminatorias, solo texto', () => {
    const conEscudos = { ...catGrupos, equipos: catGrupos.equipos.map((e) => ({ ...e, equipo: { escudo: `/api/imagenes/equipos/1?v=${e.nombre}` } })) };
    const [hoja] = construirHojasTorneo(torneo([conEscudos]));
    const primera = hoja.filas.filter(Array.isArray)[0][1];
    expect(primera.lineas).toHaveLength(2);
    expect(primera.lineas.every((l) => l.equipo)).toBe(true);
    expect(hoja.escudos.A1).toBe('/api/imagenes/equipos/1?v=A1');
    const sf = hoja.filas.filter(Array.isArray).flat().find((c) => textoCelda(c).startsWith('SF1'));
    expect(sf.lineas.some((l) => l.equipo)).toBe(false);
  });

  it('crearDocTorneo dibuja una página por categoría sin fallar (sin escudo disponible)', async () => {
    globalThis.fetch = async () => { throw new Error('sin red'); };
    const doc = await crearDocTorneo(torneo([catGrupos, catLiga]));
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
  });

  it('un turno sin partidos (descanso obligatorio) sale como «Descanso»', () => {
    const liga4 = { ...catLiga, campos: ['anexo1', 'anexo2'], equipos: inscripciones(['W', 'X', 'Y', 'Z']) };
    const [hoja] = construirHojasTorneo(torneo([liga4]));
    const vacias = hoja.filas.filter((f) => Array.isArray(f) && f[1] === 'Descanso');
    expect(vacias.length).toBeGreaterThan(0);
    vacias.forEach((f) => expect(f.slice(2).every((c) => c === '')).toBe(true));
  });

  describe('dibujo', () => {
    /** Documento cuyo text() apunta cada línea dibujada con su x y su ancho real. */
    function docQueCaptura() {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const textos = [];
      const original = doc.text.bind(doc);
      doc.text = (txt, x, y, ...resto) => {
        for (const linea of [].concat(txt)) textos.push({ linea: String(linea), x, ancho: doc.getTextWidth(String(linea)) });
        return original(txt, x, y, ...resto);
      };
      return { doc, textos };
    }

    it('no corta los datos: salen enteros el Formato y los 4 campos', async () => {
      const { doc, textos } = docQueCaptura();
      dibujarTorneo(doc, torneo([{ ...catGrupos, campos: ['anexo1', 'anexo2', 'estadio1', 'estadio2'] }]), null);
      const todo = textos.map((t) => t.linea).join(' ');
      expect(todo).toContain('Estadio 2');
      expect(todo).toMatch(/Plata/);
    });

    it('dibuja los escudos de los equipos en grupos, horario y clasificación', () => {
      const { doc } = docQueCaptura();
      const imagenes = [];
      const addImage = doc.addImage.bind(doc);
      doc.addImage = (...args) => { imagenes.push(args[0]); return addImage(...args); };
      const escudos = Object.fromEntries(catGrupos.equipos.map((e) => [e.nombre, ESCUDO_PNG]));
      dibujarTorneo(doc, torneo([catGrupos]), null, escudos);
      // 8 en grupos + 24 en el horario (12 partidos × 2) + 8 en la clasificación.
      expect(imagenes.length).toBeGreaterThanOrEqual(40);
    });

    it('ningún texto se sale del ancho de la página, aunque el nombre del torneo sea largo', async () => {
      const { doc, textos } = docQueCaptura();
      const nombre = 'Torneo de Navidad de Fútbol 7 del Club Atlético Palma del Río y amigos 2026';
      dibujarTorneo(doc, { ...torneo([catGrupos]), nombre }, null);
      for (const t of textos) expect(t.x + t.ancho).toBeLessThanOrEqual(210 - 14 + 0.5);
    });
  });
});
