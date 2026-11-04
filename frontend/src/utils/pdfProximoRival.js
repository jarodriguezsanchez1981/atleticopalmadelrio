import { jsPDF } from 'jspdf';

/**
 * PDF de Estadísticas Próximo Rival (A4 apaisado): cabecera con el partido y,
 * por cada bloque de la pantalla (Goles, Tiempo, Sanciones), sus tablas de
 * Total / Local / Visitante (equipo y jugadores) y la leyenda. Las tablas
 * llegan ya armadas con `construirHojaEstadistica` (las mismas columnas que en
 * pantalla y en Excel); aquí solo se dibujan.
 */

const NOMBRE_CLUB = 'Atlético Palma del Río';
const ESCUDO_CLUB = '/escudo.png';
const VERDE = [11, 61, 46];
const GRIS_TEXTO = [100, 116, 139];
const GRIS_LINEA = [191, 191, 191];
const GRIS_FILA = [245, 245, 245];

const ANCHO = 297;
const ALTO = 210;
const MARGEN = 10;
const PIE = 8;

const TAM_TABLA = 6.5;
const ALTO_LINEA = 2.8;
const ALTO_FILA = 5;
const ANCHO_DORSAL = 11;
const ANCHO_NOMBRE = 46;
const ANCHO_MAX_COLUMNA = 18;

/** 33.3 -> "33,3 %"; 1.67 -> "1,67"; 67.5 -> "67,5"; sin dato, "—" (como en pantalla). */
export function valorPdf(valor, formato) {
  if (!formato) return valor == null ? '' : String(valor);
  if (valor == null) return '—';
  const n = Number(valor);
  if (formato === 'porcentaje') return `${n.toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`;
  if (formato === 'decimal') return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n.toLocaleString('es-ES', { maximumFractionDigits: 1 });
}

/** Anchos de columna (mm): Dorsal y nombre fijos, el resto se reparte el
 * espacio que queda (como mucho ANCHO_MAX_COLUMNA cada una). */
export function anchosColumnas(hoja, anchoDisponible) {
  const titulos = hoja.cabeceras[0] || [];
  const fijas = titulos[0] === 'Dorsal' ? 2 : 1;
  const fijos = fijas === 2 ? [ANCHO_DORSAL, ANCHO_NOMBRE] : [ANCHO_NOMBRE];
  const resto = titulos.length - fijas;
  const ancho = resto ? Math.min(ANCHO_MAX_COLUMNA, (anchoDisponible - fijos.reduce((a, b) => a + b, 0)) / resto) : 0;
  return [...fijos, ...Array(resto).fill(ancho)];
}

/** Celdas de cabecera que se dibujan: [{ fila, col, filaFin, colFin, texto }]
 * (las combinadas, una vez; las que quedan dentro de una combinada, no). */
export function celdasCabecera(hoja) {
  const tapadas = new Set();
  const celdas = [];
  for (const [f1, c1, f2, c2] of hoja.combinadas || []) {
    for (let f = f1; f <= f2; f++) for (let c = c1; c <= c2; c++) tapadas.add(`${f},${c}`);
    celdas.push({ fila: f1, col: c1, filaFin: f2, colFin: c2, texto: hoja.cabeceras[f1][c1] });
  }
  hoja.cabeceras.forEach((fila, f) => fila.forEach((texto, c) => {
    if (!tapadas.has(`${f},${c}`)) celdas.push({ fila: f, col: c, filaFin: f, colFin: c, texto });
  }));
  return celdas;
}

/** Escudo (URL de la API o del público) como PNG en base64, con su proporción;
 * si no se puede cargar, null. */
async function cargarImagen(url) {
  if (!url) return null;
  try {
    const blob = await (await fetch(url, { credentials: 'include' })).blob();
    const objeto = URL.createObjectURL(blob);
    try {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = objeto;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      return { datos: canvas.toDataURL('image/png'), proporcion: img.naturalWidth / img.naturalHeight || 1 };
    } finally {
      URL.revokeObjectURL(objeto);
    }
  } catch {
    return null;
  }
}

function dibujarImagen(doc, imagen, x, y, alto) {
  if (!imagen) return;
  try {
    const ancho = alto * imagen.proporcion;
    doc.addImage(imagen.datos, 'PNG', x - ancho / 2, y, ancho, alto);
  } catch {
    /* imagen no válida: se omite */
  }
}

/** Dibuja una tabla desde `y`; si no cabe, sigue en otra página repitiendo la
 * cabecera. Devuelve la `y` donde termina. */
function dibujarTabla(doc, hoja, y, textoVacio) {
  const anchos = anchosColumnas(hoja, ANCHO - 2 * MARGEN);
  const xs = anchos.reduce((acc, a) => [...acc, acc[acc.length - 1] + a], [MARGEN]);
  const fijas = hoja.cabeceras[0]?.[0] === 'Dorsal' ? 2 : 1;
  const celdas = celdasCabecera(hoja);
  doc.setFontSize(TAM_TABLA);

  // Alto de cada fila de cabecera: el de la celda de una sola fila con más líneas.
  const altosCabecera = hoja.cabeceras.map((_, f) => Math.max(ALTO_FILA, ...celdas
    .filter((c) => c.fila === f && c.filaFin === f)
    .map((c) => doc.splitTextToSize(String(c.texto || ''), xs[c.colFin + 1] - xs[c.col] - 1).length * ALTO_LINEA + 2)));
  const ys = altosCabecera.reduce((acc, a) => [...acc, acc[acc.length - 1] + a], [0]);
  const altoCabecera = ys[ys.length - 1];

  const cabecera = (y0) => {
    doc.setDrawColor(...GRIS_LINEA);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(TAM_TABLA);
    for (const c of celdas) {
      const x = xs[c.col];
      const w = xs[c.colFin + 1] - x;
      const top = y0 + ys[c.fila];
      const h = ys[c.filaFin + 1] - ys[c.fila];
      doc.setFillColor(...VERDE);
      doc.rect(x, top, w, h, 'FD');
      const lineas = doc.splitTextToSize(String(c.texto || ''), w - 1);
      doc.setTextColor(255, 255, 255);
      doc.text(lineas, c.col < fijas ? x + 1 : x + w / 2, top + h / 2 - ((lineas.length - 1) * ALTO_LINEA) / 2,
        { align: c.col < fijas ? 'left' : 'center', baseline: 'middle' });
    }
    doc.setFont('helvetica', 'normal');
    return y0 + altoCabecera;
  };

  if (y + altoCabecera + ALTO_FILA > ALTO - MARGEN - PIE) {
    doc.addPage();
    y = MARGEN;
  }
  y = cabecera(y);
  doc.setTextColor(0, 0, 0);

  if (!hoja.filas.length) {
    doc.setTextColor(...GRIS_TEXTO);
    doc.rect(MARGEN, y, xs[xs.length - 1] - MARGEN, ALTO_FILA);
    doc.text(textoVacio || 'Sin datos.', MARGEN + 2, y + ALTO_FILA / 2, { baseline: 'middle' });
    doc.setTextColor(0, 0, 0);
    return y + ALTO_FILA;
  }

  hoja.filas.forEach((fila, i) => {
    if (y + ALTO_FILA > ALTO - MARGEN - PIE) {
      doc.addPage();
      y = cabecera(MARGEN);
      doc.setTextColor(0, 0, 0);
    }
    fila.forEach((valor, c) => {
      const x = xs[c];
      const w = anchos[c];
      if (i % 2) {
        doc.setFillColor(...GRIS_FILA);
        doc.rect(x, y, w, ALTO_FILA, 'FD');
      } else {
        doc.rect(x, y, w, ALTO_FILA);
      }
      const texto = valorPdf(valor, hoja.formatos[c]);
      if (c === fijas - 1) {
        // El nombre, recortado si no cabe.
        const recortado = doc.splitTextToSize(texto, w - 2)[0] || '';
        doc.text(recortado, x + 1, y + ALTO_FILA / 2, { baseline: 'middle' });
      } else {
        doc.text(texto, x + w / 2, y + ALTO_FILA / 2, { align: 'center', baseline: 'middle' });
      }
    });
    y += ALTO_FILA;
  });
  return y;
}

/** Párrafo de texto gris (descripción o leyenda) con salto de página si no cabe. */
function parrafo(doc, texto, y, tam = 7.5) {
  if (!texto) return y;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(tam);
  doc.setTextColor(...GRIS_TEXTO);
  const lineas = doc.splitTextToSize(texto, ANCHO - 2 * MARGEN);
  const alto = lineas.length * tam * 0.42;
  if (y + alto > ALTO - MARGEN - PIE) {
    doc.addPage();
    y = MARGEN;
  }
  doc.text(lineas, MARGEN, y, { baseline: 'top' });
  doc.setTextColor(0, 0, 0);
  return y + alto + 1.5;
}

function subtitulo(doc, texto, y, tam = 9) {
  if (y + 14 > ALTO - MARGEN - PIE) {
    doc.addPage();
    y = MARGEN;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(tam);
  doc.setTextColor(...VERDE);
  doc.text(texto, MARGEN, y, { baseline: 'top' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  return y + tam * 0.45 + 1.5;
}

/** Nombre del fichero: "Proximo_Rival_Alevin_B_J8.pdf". */
export function nombreFicheroPdf(categoria, jornada) {
  const limpio = String(categoria || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return `Proximo_Rival${limpio ? `_${limpio}` : ''}${jornada ? `_J${jornada}` : ''}.pdf`;
}

/**
 * Documento del PDF (sin descargarlo); `escudos`: { club, local, visitante }
 * ya cargados (o null).
 * - `titulo`: "Alevin B / 2026/2027"; `categoria`: para el nombre del fichero.
 * - `partido`: { jornada, textoFecha, lugar ('en casa' | 'fuera'), suspendido,
 *   local: { nombre, escudo }, visitante: { nombre, escudo }, rival }.
 * - `info`: línea con las jornadas con acta y las actas pendientes.
 * - `secciones`: [{ titulo, descripcion, leyenda, tablas: [{ subtitulo, hoja, textoVacio }] }];
 *   cada sección empieza en una página nueva.
 */
export function crearDocProximoRival({ titulo, partido, info, secciones }, escudos = {}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const { club: escudoClub, local: escudoLocal, visitante: escudoVisitante } = escudos;

  // Cabecera: club y título, y el partido con los dos escudos.
  dibujarImagen(doc, escudoClub, MARGEN + 6, MARGEN, 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...VERDE);
  doc.text(`Estadísticas Próximo Rival · ${titulo}`, MARGEN + 16, MARGEN + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRIS_TEXTO);
  doc.text(NOMBRE_CLUB, MARGEN + 16, MARGEN + 10.5);

  let y = MARGEN + 18;
  doc.setDrawColor(...GRIS_LINEA);
  doc.roundedRect(MARGEN, y, ANCHO - 2 * MARGEN, 30, 2, 2);
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  const lineaPartido = `Jornada ${partido.jornada} · ${partido.textoFecha} · ${partido.lugar}${partido.suspendido ? ' (suspendido)' : ''}`;
  doc.text(lineaPartido, ANCHO / 2, y + 5, { align: 'center' });
  const centroLocal = ANCHO / 2 - 65;
  const centroVisitante = ANCHO / 2 + 65;
  dibujarImagen(doc, escudoLocal, centroLocal, y + 8, 12);
  dibujarImagen(doc, escudoVisitante, centroVisitante, y + 8, 12);
  for (const [e, x] of [[partido.local, centroLocal], [partido.visitante, centroVisitante]]) {
    const esRival = e?.nombre === partido.rival;
    doc.setFont('helvetica', esRival ? 'bold' : 'normal');
    doc.setFontSize(esRival ? 11 : 10);
    doc.setTextColor(...(esRival ? VERDE : GRIS_TEXTO));
    doc.text(doc.splitTextToSize(e?.nombre || '—', 90), x, y + 25, { align: 'center' });
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...GRIS_TEXTO);
  doc.text('vs', ANCHO / 2, y + 18, { align: 'center' });
  y = parrafo(doc, info, y + 34, 8);

  secciones.forEach((s, i) => {
    if (i > 0) {
      doc.addPage();
      y = MARGEN;
    }
    y = subtitulo(doc, s.titulo, y + 2, 12);
    y = parrafo(doc, s.descripcion, y);
    for (const t of s.tablas) {
      y = subtitulo(doc, t.subtitulo, y + 2);
      y = dibujarTabla(doc, t.hoja, y, t.textoVacio) + 2;
    }
    y = parrafo(doc, s.leyenda, y + 1, 6.5);
  });

  // Pie: fecha de generación y número de página.
  const generado = new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRIS_TEXTO);
    doc.text(`${NOMBRE_CLUB} · Próximo Rival · ${titulo} · generado el ${generado}`, MARGEN, ALTO - MARGEN / 2);
    doc.text(`Página ${p} de ${paginas}`, ANCHO - MARGEN, ALTO - MARGEN / 2, { align: 'right' });
  }

  return doc;
}

/** Genera y descarga el PDF (mismos datos que crearDocProximoRival y `categoria`
 * para el nombre del fichero). */
export async function generarPdfProximoRival(datos) {
  const [club, local, visitante] = await Promise.all([
    cargarImagen(ESCUDO_CLUB), cargarImagen(datos.partido.local?.escudo), cargarImagen(datos.partido.visitante?.escudo)
  ]);
  crearDocProximoRival(datos, { club, local, visitante }).save(nombreFicheroPdf(datos.categoria, datos.partido.jornada));
}
