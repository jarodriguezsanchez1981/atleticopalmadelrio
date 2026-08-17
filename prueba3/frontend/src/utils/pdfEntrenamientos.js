import { jsPDF } from 'jspdf';

const ESCUDO_CLUB = '/escudo.png';
const NOMBRE_CLUB = 'Atlético Palma del Río';

const VERDE = '#0B3D2E';
const GRANATE = '#7A1E2B';
const GRIS = '#64748B';

const anchoA4 = 210;
const altoA4 = 297;
const margen = 14;

const ANCHO_COLUMNAS = [50, 30, 24, 28, 50];
const ALTO_FILA = 12;

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

/**
 * Genera el PDF semanal de entrenamientos en dos secciones según el tipo de
 * fútbol de la categoría (Futbol 7 / Futbol 11), ordenado por
 * Fecha y hora, Categoría y Lugar.
 */
export async function generarPdfEntrenamientos(entrenamientos, titulo = 'Calendario de entrenamientos') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const ordenar = (a, b) => {
    const fA = new Date(a.fecha || a.inicio).getTime();
    const fB = new Date(b.fecha || b.inicio).getTime();
    if (fA !== fB) return fA - fB;
    const catA = (a.categoria?.nombre || a.categoria || '').toLowerCase();
    const catB = (b.categoria?.nombre || b.categoria || '').toLowerCase();
    if (catA !== catB) return catA.localeCompare(catB, 'es');
    return ((a.lugar?.nombre || a.lugar || '')).localeCompare((b.lugar?.nombre || b.lugar || ''), 'es');
  };

  const tipoFutbol = (e) => e.categoria?.id_tipofutbol;
  const listaF7 = entrenamientos.filter((e) => tipoFutbol(e) === 1).sort(ordenar);
  const listaF11 = entrenamientos.filter((e) => tipoFutbol(e) === 2).sort(ordenar);

  const escudoClub = await cargarEscudoClub();

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

  if (entrenamientos.length) {
    const todas = [...entrenamientos].sort((a, b) => new Date(a.fecha || a.inicio) - new Date(b.fecha || b.inicio));
    const desde = formatearFechaCorta(aDate(todas[0].fecha || todas[0].inicio));
    const hasta = formatearFechaCorta(aDate(todas[todas.length - 1].fecha || todas[todas.length - 1].inicio));
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(GRIS);
    doc.text(`${desde} al ${hasta}`, anchoA4 / 2, y, { align: 'center' });
    y += 4;
  }
  doc.setDrawColor(200, 205, 212);
  doc.setLineWidth(0.3);
  doc.line(margen, y + 4, anchoA4 - margen, y + 4);
  y += 10;

  if (!entrenamientos.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(GRIS);
    doc.text('No hay entrenamientos en el periodo seleccionado.', anchoA4 / 2, y, { align: 'center' });
  } else {
    y = dibujarBloque(doc, 'FUTBOL 7', listaF7, y);
    y = dibujarBloque(doc, 'FUTBOL 11', listaF11, y + 4);
  }

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

  doc.save(`entrenamientos-${new Date().toISOString().slice(0, 10)}.pdf`);
  return doc;
}

function dibujarBloque(doc, tituloBloque, lista, yIni) {
  let y = yIni;

  // Título del bloque
  doc.setFillColor(GRANATE);
  doc.rect(margen, y, anchoA4 - 2 * margen, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(tituloBloque, anchoA4 / 2, y + 6, { align: 'center' });
  y += 12;

  if (!lista.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(GRIS);
    doc.text('No hay entrenamientos de este tipo de fútbol.', margen, y + 3);
    return y + 8;
  }

  // Cabecera de columnas
  doc.setFillColor(11, 61, 46);
  doc.rect(margen, y, anchoA4 - 2 * margen, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  const headers = ['Categoría', 'Fecha', 'Inicio', 'Fin', 'Lugar'];
  let x = margen;
  headers.forEach((h, i) => {
    doc.text(h, x + ANCHO_COLUMNAS[i] / 2, y + 5.5, { align: 'center' });
    x += ANCHO_COLUMNAS[i];
  });
  y += 11;

  let fila = 0;
  for (const e of lista) {
    const inicio = aDate(e.fecha || e.inicio);
    const cat = e.categoria?.nombre || e.categoria || '—';
    const lugar = e.lugar?.nombre || e.lugar || '—';
    const fecha = inicio ? formatearFechaCorta(inicio) : '—';
    const horaInicio = inicio ? formatearHora(inicio) : '—';
    const minutos = e.categoria?.tiempoentrenamiento || 60;
    const horaFin = inicio ? formatearHora(new Date(inicio.getTime() + minutos * 60000)) : '—';

    if (y + ALTO_FILA > altoA4 - 16) {
      doc.addPage();
      y = 14;
    }

    if (fila % 2 === 1) {
      doc.setFillColor(245, 247, 249);
      doc.rect(margen, y, anchoA4 - 2 * margen, ALTO_FILA, 'F');
    }

    const mitadV = y + ALTO_FILA / 2 + 1;
    const inicioCol0 = margen;
    const centro = (i) => inicioCol0 + ANCHO_COLUMNAS.slice(0, i).reduce((a, b) => a + b, 0) + ANCHO_COLUMNAS[i] / 2;

    // Categoría
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(GRANATE);
    const catTexto = ajustarTexto(doc, cat, 9, ANCHO_COLUMNAS[0] - 4);
    doc.text(catTexto, centro(0), mitadV, { align: 'center' });

    // Fecha
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20, 26, 32);
    const fechaTexto = ajustarTexto(doc, fecha, 9, ANCHO_COLUMNAS[1] - 4);
    doc.text(fechaTexto, centro(1), mitadV, { align: 'center' });

    // Inicio
    doc.text(horaInicio, centro(2), mitadV, { align: 'center' });

    // Fin
    doc.text(horaFin, centro(3), mitadV, { align: 'center' });

    // Lugar
    const lugarTexto = ajustarTexto(doc, lugar, 9, ANCHO_COLUMNAS[4] - 4);
    doc.text(lugarTexto, centro(4), mitadV, { align: 'center' });

    y += ALTO_FILA;
    fila++;
  }

  return y;
}