import { jsPDF } from 'jspdf';
import { utilService } from '../services';

const ESCUDO_CLUB = '/escudo.png';
const NOMBRE_CLUB = 'ATLÉTICO PALMA DEL RÍO';
const NOMBRE_PALMA = 'PALMA DEL RIO ATLETICO C.F.';

const VERDE = '#0B3D2E';
const GRANATE = '#7A1E2B';
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

function claveFecha(inicio) {
  const d = aDate(inicio);
  return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : 'sin-fecha';
}

function agruparPorFecha(items) {
  const grupos = [];
  const mapa = new Map();
  for (const item of items) {
    const clave = claveFecha(item.inicio || item.fecha);
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
 * Genera el PDF del calendario con partidos y entrenamientos mezclados,
 * agrupados únicamente por fecha.
 * @param {Array} eventos  Eventos normalizados del calendario (con `tipo`).
 * @param {string} titulo  Texto del rango de fechas (ej: "22/09/2026 al 28/09/2026").
 * @param {number|null} tipoFutbol 1 = solo Futbol 7, 2 = solo Futbol 11, null/undefined = ambos.
 */
export async function generarPdfCalendario(eventos, titulo = '', tipoFutbol = null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const filtrar = (e) => tipoFutbol == null || (e.categoria?.id_tipofutbol || 0) === tipoFutbol;
  const todos = eventos
    .filter(filtrar)
    .map((e) => ({ ...e, _tipo: e.tipo === 'partido' ? 'partido' : 'entrenamiento' }))
    .sort((a, b) => new Date(a.inicio) - new Date(b.inicio));

  // Precarga de escudos (solo partidos)
  const fuentes = new Set([ESCUDO_CLUB]);
  todos.forEach((e) => {
    if (e._tipo === 'partido') {
      if (e.equipoLocal?.escudo) fuentes.add(e.equipoLocal.escudo);
      if (e.equipoVisitante?.escudo) fuentes.add(e.equipoVisitante.escudo);
    }
  });
  const imagenes = {};
  await Promise.all([...fuentes].map(async (src) => {
    imagenes[src] = await aDataUrl(src);
  }));
  const escudoClub = imagenes[ESCUDO_CLUB] || null;

  let y = 12;

  // ---- Encabezado ----
  const escudoHeader = 22;
  dibujarEscudo(doc, escudoClub, margen, y, escudoHeader);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(VERDE);
  doc.text('Calendario', anchoA4 / 2, y + escudoHeader / 2 + 2, { align: 'center' });
  y += escudoHeader + 6;

  if (titulo) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(GRIS);
    doc.text(titulo, anchoA4 / 2, y, { align: 'center' });
    y += 6;
  }

  // ---- Agrupar por fecha (partidos y entrenamientos mezclados) ----
  for (const grupo of agruparPorFecha(todos)) {
    const fechaTexto = formatearFechaLarga(aDate(grupo.items[0].inicio));
    if (y + 20 > altoA4 - 16) {
      doc.addPage();
      y = 14;
    }
    y = dibujarBannerFecha(doc, fechaTexto, y);
    y = dibujarCabecera(doc, ['Lugar', 'Hora', 'Categoría', 'Local', 'Visitante'], ANCHO_COLUMNAS, y);

    let fila = 0;
    for (const item of grupo.items) {
      if (y + ALTO_FILA > altoA4 - 16) {
        doc.addPage();
        y = 14;
        y = dibujarCabecera(doc, ['Lugar', 'Hora', 'Categoría', 'Local', 'Visitante'], ANCHO_COLUMNAS, y);
      }
      if (fila % 2 === 1) {
        doc.setFillColor(245, 247, 249);
        doc.rect(margen, y - 0.5, anchoA4 - 2 * margen, ALTO_FILA, 'F');
      }
      if (item._tipo === 'partido') {
        y = dibujarFilaPartido(doc, item, imagenes, escudoClub, y);
      } else {
        y = dibujarFilaEntrenamiento(doc, item, y);
      }
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
    doc.text(`${NOMBRE_CLUB} · Calendario`, margen, altoA4 - 8);
    doc.text(`Página ${p} de ${totalPaginas}`, anchoA4 - margen, altoA4 - 8, { align: 'right' });
  }

  doc.save(`calendario-${new Date().toISOString().slice(0, 10)}.pdf`);
  return doc;
}

function dibujarFilaPartido(doc, p, imagenes, escudoClub, y) {
  const inicio = aDate(p.inicio);
  const cat = p.categoria?.nombre || '—';
  const esLocalPalma = p.equipoLocal?.nombre === NOMBRE_PALMA;
  const lugarNombre = typeof p.lugar === 'string' ? p.lugar : (p.lugar?.nombre || null);
  const lugar = esLocalPalma ? (lugarNombre || '—') : (p.equipoLocal?.localidad || '—');

  const localNombre = p.equipoLocal?.nombre || NOMBRE_CLUB;
  const visitanteNombre = p.equipoVisitante?.nombre || '—';
  const localImgSrc = p.equipoLocal?.escudo || null;
  const visitImgSrc = p.equipoVisitante?.escudo || null;
  const localImg = localImgSrc ? (imagenes[localImgSrc] || null) : escudoClub;
  const visitImg = visitImgSrc ? (imagenes[visitImgSrc] || null) : null;

  const escudoTamanio = 7;
  const mitadV = y + ALTO_FILA / 2 + 0.5;
  let x = margen;

  // Lugar / localidad
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(20, 26, 32);
  const lugarTexto = ajustarTexto(doc, lugar, 8, ANCHO_COLUMNAS[0] - 2);
  doc.text(lugarTexto, x + 1.5, mitadV);
  x += ANCHO_COLUMNAS[0];

  // Hora
  const horaTexto = inicio ? formatearHora(inicio) : '—';
  doc.setFontSize(8.5);
  doc.text(horaTexto, x + 2, mitadV, { align: 'left' });
  x += ANCHO_COLUMNAS[1];

  // Categoría
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(GRANATE);
  const catTexto = ajustarTexto(doc, cat, 9.5, ANCHO_COLUMNAS[2] - 2);
  doc.text(catTexto, x + ANCHO_COLUMNAS[2] / 2, mitadV, { align: 'center' });
  x += ANCHO_COLUMNAS[2];

  // Local (escudo + nombre, alineado a la izquierda)
  const anchoNombreLocal = ANCHO_COLUMNAS[3] - escudoTamanio - 6;
  const localAjustado = ajustarTexto(doc, localNombre, 8, anchoNombreLocal);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const xLocal = x + 2;
  dibujarEscudo(doc, localImg, xLocal, mitadV - escudoTamanio / 2, escudoTamanio);
  doc.setTextColor(20, 26, 32);
  doc.text(localAjustado, xLocal + escudoTamanio + 2, mitadV);
  x += ANCHO_COLUMNAS[3];

  // Visitante (escudo + nombre, alineado a la izquierda)
  const anchoNombreVisitante = ANCHO_COLUMNAS[4] - escudoTamanio - 6;
  const visitanteAjustado = ajustarTexto(doc, visitanteNombre, 8, anchoNombreVisitante);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const xVisitante = x + 2;
  dibujarEscudo(doc, visitImg, xVisitante, mitadV - escudoTamanio / 2, escudoTamanio);
  doc.setTextColor(20, 26, 32);
  doc.text(visitanteAjustado, xVisitante + escudoTamanio + 2, mitadV);

  return y + ALTO_FILA;
}

function dibujarFilaEntrenamiento(doc, e, y) {
  const inicio = aDate(e.inicio);
  const cat = e.categoria?.nombre || '—';
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
  x += ANCHO_COLUMNAS[2];

  // Local / Visitante vacíos para entrenamientos
  return y + ALTO_FILA;
}
