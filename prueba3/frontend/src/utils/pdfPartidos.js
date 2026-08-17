import { jsPDF } from 'jspdf';
import { utilService } from '../services';

const ESCUDO_CLUB = '/escudo.png';
const NOMBRE_CLUB = 'Atlético Palma del Río';

const VERDE = '#0B3D2E';
const GRANATE = '#7A1E2B';
const GRIS = '#64748B';

const anchoA4 = 210;
const altoA4 = 297;
const margen = 14;

// Columnas de la tabla de cada bloque
// Orden: Categoría | Local / Visitante | Fecha y hora | Lugar
const ANCHO_COLUMNAS = [30, 80, 30, 42];
const ALTO_FILA = 21;

function aDate(inicio) {
  const d = new Date(inicio);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatearFechaCorta(d) {
  if (!d) return '—';
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatearHora(d) {
  if (!d) return '—';
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function linea(doc, y, inicio = margen, fin = anchoA4 - margen) {
  doc.setDrawColor(200, 205, 212);
  doc.setLineWidth(0.3);
  doc.line(inicio, y, fin, y);
}

function esDataUrl(src) {
  return typeof src === 'string' && src.trim().startsWith('data:');
}

function esUrlExterna(src) {
  return typeof src === 'string' && /^https?:\/\//i.test(src.trim());
}

function formatoDesdeDataUrl(dataUrl) {
  const m = /^data:image\/([\w+]+);/i.exec(dataUrl || '');
  const t = (m ? m[1] : '').toLowerCase();
  if (t.includes('png')) return 'PNG';
  if (t.includes('jpeg') || t === 'jpg') return 'JPEG';
  return 'PNG';
}

/**
 * Convierte cualquier fuente de imagen (data-URL, URL externa o ruta local)
 * en un data-URL utilizable por jsPDF. Las URLs externas se descargan vía el
 * proxy del backend para evitar bloqueos de CORS.
 */
async function aDataUrl(src) {
  if (!src) return null;

  if (esDataUrl(src)) return src.trim();

  if (esUrlExterna(src)) {
    try {
      const proxy = await utilService.imagen(src);
      return proxy?.dataUrl || null;
    } catch {
      return null;
    }
  }

  try {
    const res = await fetch(src);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function dibujarEscudo(doc, dataUrl, x, y, ancho) {
  if (!dataUrl) return;
  const formato = formatoDesdeDataUrl(dataUrl);
  try {
    doc.addImage(dataUrl, formato, x, y, ancho, ancho);
  } catch {
    try {
      doc.addImage(dataUrl, 'PNG', x, y, ancho, ancho);
    } catch {
      /* escudo no válido: se omite sin romper el PDF */
    }
  }
}

/** Recorta un texto añadiendo "…" si no cabe en el ancho máximo dado. */
function ajustarTexto(doc, texto, size, anchoMax) {
  doc.setFontSize(size);
  let t = String(texto ?? '');
  if (doc.getTextWidth(t) <= anchoMax) return t;
  let recortado = t;
  while (recortado.length > 1 && doc.getTextWidth(`${recortado}…`) > anchoMax) {
    recortado = recortado.slice(0, -1);
  }
  return `${recortado}…`;
}

/**
 * Genera el PDF con el escudo del club y dos bloques: partidos locales y
 * partidos visitantes. Cada fila muestra ambos escudos y nombre de equipo,
 * la fecha y hora, el lugar y la categoría.
 */
export async function generarPdfPartidos(partidos, titulo = 'Calendario de partidos') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const locales = partidos.filter((p) => p.es_local);
  const visitantes = partidos.filter((p) => !p.es_local);

  const porFecha = (a, b) => new Date(a.inicio) - new Date(b.inicio);
  locales.sort(porFecha);
  visitantes.sort(porFecha);

  // Precarga de escudos: el del club + todos los de los equipos implicados
  const fuentes = new Set([ESCUDO_CLUB]);
  [...locales, ...visitantes].forEach((p) => {
    if (p.equipo?.escudo) fuentes.add(p.equipo.escudo);
  });
  const imagenes = {};
  await Promise.all([...fuentes].map(async (src) => {
    imagenes[src] = await aDataUrl(src);
  }));

  const escudoClub = imagenes[ESCUDO_CLUB] || null;

  let y = 10;

  // ---- Encabezado ----
  dibujarEscudo(doc, escudoClub, (anchoA4 - 30) / 2, y, 30);
  y += 34;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(VERDE);
  doc.text(NOMBRE_CLUB, anchoA4 / 2, y, { align: 'center' });
  y += 7;

  doc.setFontSize(12);
  doc.setTextColor(GRANATE);
  doc.text(titulo, anchoA4 / 2, y, { align: 'center' });
  y += 5.5;

  if (partidos.length) {
    const desde = formatearFechaCorta(aDate(partidos[0].inicio));
    const hasta = formatearFechaCorta(aDate(partidos[partidos.length - 1].inicio));
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(GRIS);
    doc.text(`${desde} al ${hasta}`, anchoA4 / 2, y, { align: 'center' });
    y += 4;
  }
  linea(doc, y + 4);
  y += 10;

  y = dibujarBloque(doc, 'PARTIDOS LOCAL', locales, escudoClub, imagenes, y);
  y = dibujarBloque(doc, 'PARTIDOS VISITANTES', visitantes, escudoClub, imagenes, y + 4);

  // ---- Pie ----
  const totalPaginas = doc.getNumberOfPages();
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(GRIS);
    doc.text(`${NOMBRE_CLUB} · ${titulo}`, margen, altoA4 - 8);
    doc.text(`Página ${p} de ${totalPaginas}`, anchoA4 - margen, altoA4 - 8, { align: 'right' });
  }

  doc.save(`partidos-${new Date().toISOString().slice(0, 10)}.pdf`);
  return doc;
}

function dibujarBloque(doc, tituloBloque, lista, escudoClub, imagenes, yIni) {
  let y = yIni;

  // Título del bloque
  doc.setFillColor(GRANATE);
  doc.rect(margen, y, anchoA4 - 2 * margen, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(tituloBloque, anchoA4 / 2, y + 6, { align: 'center' });
  y += 13;

  if (!lista.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(GRIS);
    doc.text('No hay partidos.', margen, y + 3);
    return y + 8;
  }

  // Cabecera de columnas
  doc.setFillColor(11, 61, 46);
  doc.rect(margen, y, anchoA4 - 2 * margen, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  const headers = ['Categoría', 'Local / Visitante', 'Fecha y hora', 'Lugar'];
  let x = margen;
  headers.forEach((h, i) => {
    doc.text(h, x + ANCHO_COLUMNAS[i] / 2, y + 5.5, { align: 'center' });
    x += ANCHO_COLUMNAS[i];
  });
  y += 11;

  let fila = 0;
  for (const p of lista) {
    const inicio = aDate(p.inicio);
    const esLocal = p.es_local;
    const rival = p.equipo?.nombre || '—';
    const escudoRival = p.equipo?.escudo ? (imagenes[p.equipo.escudo] || null) : null;
    const lugar = esLocal
      ? (p.lugar?.nombre || '—')
      : (p.equipo?.localidad || '—');
    const cat = p.categoria?.alias || p.categoria?.nombre || '—';

    const localNombre = esLocal ? NOMBRE_CLUB : rival;
    const visitanteNombre = esLocal ? rival : NOMBRE_CLUB;
    const localImg = esLocal ? escudoClub : escudoRival;
    const visitImg = esLocal ? escudoRival : escudoClub;

    const lineaFecha = inicio ? `${formatearFechaCorta(inicio)} · ${formatearHora(inicio)}` : '—';

    if (y + ALTO_FILA > altoA4 - 16) {
      doc.addPage();
      y = 14;
    }

    if (fila % 2 === 1) {
      doc.setFillColor(245, 247, 249);
      doc.rect(margen, y - 2, anchoA4 - 2 * margen, ALTO_FILA, 'F');
    }

    const escudoTamanio = 8;
    const mitadV = y + ALTO_FILA / 2 + 1;

    // Centro horizontal de cada columna
    const inicioCol0 = margen;
    const centroCol0 = inicioCol0 + ANCHO_COLUMNAS[0] / 2;
    const centroCol2 = inicioCol0 + ANCHO_COLUMNAS[0] + ANCHO_COLUMNAS[1] + ANCHO_COLUMNAS[2] / 2;
    const centroCol3 = anchoA4 - margen - ANCHO_COLUMNAS[3] / 2;

    // --- Categoría (primera columna, centrada) ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(GRANATE);
    const catTexto = ajustarTexto(doc, cat, 9, ANCHO_COLUMNAS[0] - 2);
    doc.text(catTexto, centroCol0, mitadV, { align: 'center' });

    // --- Local / Visitante (segunda columna, alineada a la izquierda) ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    const xBloque = inicioCol0 + ANCHO_COLUMNAS[0] + 2;
    const anchoNombre = ANCHO_COLUMNAS[1] - escudoTamanio - 6;
    const localNombreAjustado = ajustarTexto(doc, localNombre, 8.5, anchoNombre);
    const visitanteNombreAjustado = ajustarTexto(doc, visitanteNombre, 8.5, anchoNombre);

    // Local: escudo + nombre
    dibujarEscudo(doc, localImg, xBloque, y + 1, escudoTamanio);
    doc.setTextColor(20, 26, 32);
    doc.text(localNombreAjustado, xBloque + escudoTamanio + 2, y + 6);

    // Visitante: escudo + nombre
    dibujarEscudo(doc, visitImg, xBloque, y + 12, escudoTamanio);
    doc.setTextColor(20, 26, 32);
    doc.text(visitanteNombreAjustado, xBloque + escudoTamanio + 2, y + 17);

    // --- Fecha y hora (centrada) ---
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(20, 26, 32);
    const fechaTexto = ajustarTexto(doc, lineaFecha, 9, ANCHO_COLUMNAS[2] - 2);
    doc.text(fechaTexto, centroCol2, mitadV, { align: 'center' });

    // --- Lugar (centrada) ---
    const lugarTexto = ajustarTexto(doc, lugar, 9, ANCHO_COLUMNAS[3] - 2);
    doc.text(lugarTexto, centroCol3, mitadV, { align: 'center' });

    y += ALTO_FILA + 2;
    fila++;
  }

  return y;
}