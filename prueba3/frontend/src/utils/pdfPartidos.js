import { jsPDF } from 'jspdf';
import { utilService } from '../services';

const ESCUDO_CLUB = '/escudo.png';
const NOMBRE_CLUB = 'ATLÉTICO PALMA DEL RÍO';

const VERDE = '#0B3D2E';
const GRANATE = '#7A1E2B';
const GRIS = '#64748B';

const anchoA4 = 210;
const altoA4 = 297;
const margen = 14;

// Columnas de cada fila: Lugar | Hora | Categoría | Visitante
const ANCHO_COLUMNAS = [28, 18, 30, 104];
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

function claveFecha(p) {
  const d = aDate(p.inicio);
  return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : 'sin-fecha';
}

/**
 * Genera el PDF con los partidos agrupados por Fecha.
 * @param {Array} partidos
 * @param {string} semana  Texto del rango de fechas (ej: "22/09/2026 al 28/09/2026")
 * @param {number|null} tipoFutbol 1 = solo Futbol 7, 2 = solo Futbol 11, null/undefined = ambos
 */
export async function generarPdfPartidos(partidos, semana = '', tipoFutbol = null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const filtrar = (p) => tipoFutbol == null || (p.categoria?.id_tipofutbol || p.id_tipofutbol) === tipoFutbol;
  const partidosFiltrados = partidos.filter(filtrar).sort((a, b) => new Date(a.inicio) - new Date(b.inicio));

  // Precarga de escudos
  const fuentes = new Set([ESCUDO_CLUB]);
  partidosFiltrados.forEach((p) => {
    if (p.equipo?.escudo) fuentes.add(p.equipo.escudo);
  });
  const imagenes = {};
  await Promise.all([...fuentes].map(async (src) => {
    imagenes[src] = await aDataUrl(src);
  }));

  const escudoClub = imagenes[ESCUDO_CLUB] || null;

  let y = 12;

  // ---- Encabezado: 2 columnas sin borde ----
  const escudoHeader = 22;
  dibujarEscudo(doc, escudoClub, margen, y, escudoHeader);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(VERDE);
  doc.text('Listado de Partidos', anchoA4 / 2, y + escudoHeader / 2 + 2, { align: 'center' });
  y += escudoHeader + 6;

  // ---- Agrupar por fecha ----
  const grupos = [];
  const mapa = new Map();
  for (const p of partidosFiltrados) {
    const clave = claveFecha(p);
    if (!mapa.has(clave)) {
      const grupo = { clave, partidos: [] };
      mapa.set(clave, grupo);
      grupos.push(grupo);
    }
    mapa.get(clave).partidos.push(p);
  }

  for (const grupo of grupos) {
    y = dibujarGrupo(doc, grupo, escudoClub, imagenes, y);
  }

  // ---- Pie ----
  const totalPaginas = doc.getNumberOfPages();
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(GRIS);
    doc.text(`${NOMBRE_CLUB} · Listado de Partidos`, margen, altoA4 - 8);
    doc.text(`Página ${p} de ${totalPaginas}`, anchoA4 - margen, altoA4 - 8, { align: 'right' });
  }

  doc.save(`partidos-${new Date().toISOString().slice(0, 10)}.pdf`);
  return doc;
}

function dibujarGrupo(doc, grupo, escudoClub, imagenes, yIni) {
  const primerPartido = grupo.partidos[0];
  const inicio = aDate(primerPartido.inicio);
  const fechaTexto = inicio ? formatearFechaLarga(inicio) : '—';

  let y = yIni;

  const altoBanner = 7;
  if (y + altoBanner + 7 + grupo.partidos.length * (ALTO_FILA + 0.5) > altoA4 - 16) {
    doc.addPage();
    y = 14;
  }

  // --- Banner de fecha ---
  doc.setFillColor(GRANATE);
  doc.rect(margen, y, anchoA4 - 2 * margen, altoBanner, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text(fechaTexto, margen + 3, y + 5);
  y += altoBanner + 1.5;

  // --- Cabecera de columnas ---
  doc.setFillColor(11, 61, 46);
  doc.rect(margen, y, anchoA4 - 2 * margen, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  const headers = ['Lugar', 'Hora', 'Categoría', 'Visitante'];
  let x = margen;
  headers.forEach((h, i) => {
    const align = i <= 1 ? 'left' : 'center';
    const offset = i <= 1 ? 1.5 : ANCHO_COLUMNAS[i] / 2;
    doc.text(h, x + offset, y + 4.2, { align });
    x += ANCHO_COLUMNAS[i];
  });
  y += 7.5;

  // --- Filas ---
  let fila = 0;
  for (const p of grupo.partidos) {
    const esLocal = p.es_local;
    const rival = p.equipo?.nombre || '—';
    const escudoRival = p.equipo?.escudo ? (imagenes[p.equipo.escudo] || null) : null;
    const cat = p.categoria?.nombre || '—';
    const lugar = esLocal ? (p.lugar?.nombre || '—') : (p.equipo?.localidad || '—');

    const localNombre = esLocal ? NOMBRE_CLUB : rival;
    const visitanteNombre = esLocal ? rival : NOMBRE_CLUB;
    const localImg = esLocal ? escudoClub : escudoRival;
    const visitImg = esLocal ? escudoRival : escudoClub;

    if (y + ALTO_FILA > altoA4 - 16) {
      doc.addPage();
      y = 14;
    }

    if (fila % 2 === 1) {
      doc.setFillColor(245, 247, 249);
      doc.rect(margen, y - 0.5, anchoA4 - 2 * margen, ALTO_FILA, 'F');
    }

    const escudoTamanio = 7;
    const mitadV = y + ALTO_FILA / 2 + 0.5;

    let x = margen;

    // --- Lugar ---
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(20, 26, 32);
    const lugarTexto = ajustarTexto(doc, lugar, 8, ANCHO_COLUMNAS[0] - 2);
    doc.text(lugarTexto, x + 1.5, mitadV);
    x += ANCHO_COLUMNAS[0];

    // --- Hora ---
    const inicioP = aDate(p.inicio);
    const horaTexto = inicioP ? formatearHora(inicioP) : '—';
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(20, 26, 32);
    doc.text(horaTexto, x + 2, mitadV, { align: 'left' });
    x += ANCHO_COLUMNAS[1];

    // --- Categoría ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(GRANATE);
    const catTexto = ajustarTexto(doc, cat, 9.5, ANCHO_COLUMNAS[2] - 2);
    doc.text(catTexto, x + ANCHO_COLUMNAS[2] / 2, mitadV, { align: 'center' });
    x += ANCHO_COLUMNAS[2];

    // --- Visitante (escudo + nombre, centrado) ---
    const anchoNombre = ANCHO_COLUMNAS[3] - escudoTamanio - 5;
    const visitanteAjustado = ajustarTexto(doc, visitanteNombre, 8, anchoNombre);
    doc.setFontSize(8);
    const anchoCombo = escudoTamanio + 2 + doc.getTextWidth(visitanteAjustado);
    const xCentrado = x + (ANCHO_COLUMNAS[3] - anchoCombo) / 2;
    dibujarEscudo(doc, visitImg, xCentrado, mitadV - escudoTamanio / 2, escudoTamanio);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(20, 26, 32);
    doc.text(visitanteAjustado, xCentrado + escudoTamanio + 2, mitadV);

    y += ALTO_FILA + 0.5;
    fila++;
  }

  return y + 4;
}
