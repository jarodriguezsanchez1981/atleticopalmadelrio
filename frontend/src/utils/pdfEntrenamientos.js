import { jsPDF } from 'jspdf';

const ESCUDO_CLUB = '/escudo.png';
const NOMBRE_CLUB = 'Atlético Palma del Río';

const VERDE = '#0F3D22';
const GRIS = '#64748B';

const anchoA4 = 210;
const altoA4 = 297;
const margen = 14;

// Columnas: Lugar | Hora | Categoría | Local | Visitante
const ANCHO_COLUMNAS = [26, 16, 26, 57, 57];
const ALTO_FILA = 10;

function aDate(inicio) {
  const d = new Date(inicio);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatearFechaLarga(d) {
  if (!d) return '—';
  const dia = d.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  return dia.charAt(0).toUpperCase() + dia.slice(1);
}

function formatearHora(d) {
  if (!d) return '—';
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function claveFecha(inicio) {
  const d = aDate(inicio);
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function cargarEscudoClub() {
  const res = await fetch(ESCUDO_CLUB);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function dibujarEscudo(doc, dataUrl, x, y, ancho) {
  if (!dataUrl) return;
  try {
    doc.addImage(dataUrl, 'PNG', x, y, ancho, ancho);
  } catch {
    /* no válido: se omite */
  }
}

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

function agruparPorFecha(items) {
  const grupos = [];
  const mapa = new Map();
  for (const item of items) {
    const clave = claveFecha(item.inicio);
    if (!mapa.has(clave)) {
      const grupo = { clave, items: [] };
      mapa.set(clave, grupo);
      grupos.push(grupo);
    }
    mapa.get(clave).items.push(item);
  }
  return grupos;
}

function dibujarBannerFecha(doc, texto, y) {
  doc.setFillColor(215, 119, 6);
  doc.rect(margen, y, anchoA4 - 2 * margen, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text(texto, margen + 3, y + 5);
  return y + 9;
}

function dibujarCabecera(doc, headers, anchos, y) {
  doc.setFillColor(11, 61, 46);
  doc.rect(margen, y, anchoA4 - 2 * margen, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  let x = margen;
  headers.forEach((h, i) => {
    const align = i <= 1 ? 'left' : 'center';
    const offset = i <= 1 ? 1.5 : anchos[i] / 2;
    doc.text(h, x + offset, y + 4.2, { align });
    x += anchos[i];
  });
  return y + 8;
}

/**
 * Genera el PDF de entrenamientos con la misma estructura que el calendario:
 * agrupado por fecha, columnas Lugar | Hora | Categoría (Local y Visitante vacías).
 * @param {Array} entrenamientos
 * @param {string} titulo  Texto del rango de fechas (ej: "22/09/2026 al 28/09/2026").
 * @param {number|null} tipoFutbol 1 = solo Futbol 7, 2 = solo Futbol 11, null/undefined = ambos.
 */
export async function generarPdfEntrenamientos(entrenamientos, titulo = '', tipoFutbol = null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const filtrar = (e) => tipoFutbol == null
    || (e.categoria?.id_tipofutbol || e.plantilla?.categoria?.id_tipofutbol || 0) === tipoFutbol;

  const lista = entrenamientos
    .filter(filtrar)
    .map((e) => ({
      inicio: e.fecha || e.inicio,
      lugar: e.lugar?.nombre || e.lugar || '—',
      categoria: e.categoria?.nombre || e.plantilla?.categoria?.nombre || e.categoria || '—'
    }))
    .sort((a, b) => new Date(a.inicio) - new Date(b.inicio));

  const escudoClub = await cargarEscudoClub();

  let y = 12;

  // ---- Encabezado ----
  const escudoHeader = 22;
  dibujarEscudo(doc, escudoClub, margen, y, escudoHeader);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(VERDE);
  doc.text('Entrenamientos', anchoA4 / 2, y + escudoHeader / 2 + 2, { align: 'center' });
  y += escudoHeader + 6;

  if (titulo) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(GRIS);
    doc.text(titulo, anchoA4 / 2, y, { align: 'center' });
    y += 6;
  }

  // ---- Agrupar por fecha ----
  for (const grupo of agruparPorFecha(lista)) {
    const fechaTexto = formatearFechaLarga(aDate(grupo.items[0].inicio));
    if (y + 20 > altoA4 - 16) {
      doc.addPage();
      y = 14;
    }
    y = dibujarBannerFecha(doc, fechaTexto, y);
    y = dibujarCabecera(doc, ['Lugar', 'Hora', 'Categoría', 'Local', 'Visitante'], ANCHO_COLUMNAS, y);

    let fila = 0;
    for (const e of grupo.items) {
      if (y + ALTO_FILA > altoA4 - 16) {
        doc.addPage();
        y = 14;
        y = dibujarCabecera(doc, ['Lugar', 'Hora', 'Categoría', 'Local', 'Visitante'], ANCHO_COLUMNAS, y);
      }
      if (fila % 2 === 1) {
        doc.setFillColor(245, 247, 249);
        doc.rect(margen, y - 0.5, anchoA4 - 2 * margen, ALTO_FILA, 'F');
      }
      y = dibujarFila(doc, e, y);
      fila++;
    }
    y += 3;
  }

  // ---- Pie ----
  const totalPaginas = doc.getNumberOfPages();
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(GRIS);
    doc.text(`${NOMBRE_CLUB} · Entrenamientos`, margen, altoA4 - 8);
    doc.text(`Página ${p} de ${totalPaginas}`, anchoA4 - margen, altoA4 - 8, { align: 'right' });
  }

  doc.save(`entrenamientos-${new Date().toISOString().slice(0, 10)}.pdf`);
  return doc;
}

function dibujarFila(doc, e, y) {
  const inicio = aDate(e.inicio);
  const cat = e.categoria || '—';
  const lugar = e.lugar || '—';
  const horaTexto = inicio ? formatearHora(inicio) : '—';

  const mitadV = y + ALTO_FILA / 2 + 0.5;
  let x = margen;

  // Lugar
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(20, 26, 32);
  const lugarTexto = ajustarTexto(doc, lugar, 8, ANCHO_COLUMNAS[0] - 2);
  doc.text(lugarTexto, x + 1.5, mitadV);
  x += ANCHO_COLUMNAS[0];

  // Hora
  doc.setFontSize(8.5);
  doc.text(horaTexto, x + 2, mitadV, { align: 'left' });
  x += ANCHO_COLUMNAS[1];

  // Categoría
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(VERDE);
  const catTexto = ajustarTexto(doc, cat, 9, ANCHO_COLUMNAS[2] - 2);
  doc.text(catTexto, x + ANCHO_COLUMNAS[2] / 2, mitadV, { align: 'center' });

  return y + ALTO_FILA;
}
