import { jsPDF } from 'jspdf';

/**
 * Carta de invitación a un torneo del club (sección Notificaciones →
 * Invitación Torneo). El formulario pasa { nombreTorneo, fecha, hora, lugar,
 * categorias } (una o varias; también vale `categoria` con una sola) y aquí se genera un PDF A4 con el formato oficial del club
 * (escudo, cabecera azul, tabla de datos y pie). `construirInvitacion` arma
 * el texto (función pura, testeable) y `crearDocInvitacionTorneo` lo dibuja.
 */

const NAVY = '#22357F';
const GRIS = '#64748B';
const AMARILLO = '#F2C200';
const TEXTO = '#1F2937';
const ESCUDO = '/escudo.png';
const ORGANIZADOR = 'Club Atlético Palma del Río';

const anchoA4 = 210;
const altoA4 = 297;
const margen = 20;
const anchoTexto = anchoA4 - 2 * margen;

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Acepta un Date, un ISO o un 'YYYY-MM-DD' (este último en hora local, sin
 * desplazamiento por zona horaria). null si no es una fecha válida. */
function aFecha(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor;
  const s = String(valor);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 'Sábado, 31 de octubre' (como en la carta de ejemplo, sin año). */
export function formatearFechaCarta(valor) {
  const d = aFecha(valor);
  if (!d) return '';
  const dia = DIAS[d.getDay()];
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

function limpio(v, porDefecto = '') {
  const t = String(v ?? '').trim();
  return t || porDefecto;
}

/** ['Bebé', 'Prebenjamín', 'Benjamín'] -> 'Bebé, Prebenjamín y Benjamín'. */
export function unirCategorias(lista) {
  if (lista.length <= 1) return lista[0] || '';
  return `${lista.slice(0, -1).join(', ')} y ${lista[lista.length - 1]}`;
}

/** Arma el texto de la carta a partir de los valores del formulario. Pura. */
export function construirInvitacion(valores = {}) {
  const nombreTorneo = limpio(valores.nombreTorneo, 'Torneo de Fútbol');
  const lista = (Array.isArray(valores.categorias) ? valores.categorias : [valores.categoria])
    .map((c) => limpio(c)).filter(Boolean);
  const categoria = unirCategorias(lista);
  const coletilla = lista.length > 1 ? `, en las categorías ${categoria}` : `, en la categoría ${categoria}`;
  const lugar = limpio(valores.lugar, '—');
  const hora = limpio(valores.hora, '—');
  const fechaLarga = formatearFechaCarta(valores.fecha) || '—';

  const subtitulo = `Invitación oficial · ${nombreTorneo}`;
  const parrafos = [
    'A la atención del club invitado y de su coordinación deportiva:',
    `Desde el ${ORGANIZADOR} tenemos el placer de invitaros a participar en nuestro ${nombreTorneo}${categoria ? coletilla : ''}, una jornada pensada para que los más pequeños disfruten del fútbol en un ambiente de convivencia, compañerismo, ilusión y deportividad.`,
    `El torneo se celebrará el ${fechaLarga}, en horario de ${hora}, en ${lugar}. Nos encantaría contar con vuestra presencia y compartir una mañana de fútbol base en la que los niños y niñas sean los verdaderos protagonistas.`
  ];
  const parrafosCierre = [
    'Para nuestra entidad sería un honor contar con vuestro equipo. Estamos convencidos de que será una magnífica ocasión para disfrutar del deporte, fomentar valores positivos y seguir impulsando juntos el fútbol desde las primeras etapas.',
    'Os agradeceríamos que nos confirmarais vuestra participación y quedamos a vuestra disposición para facilitar cualquier información adicional sobre la organización del torneo.',
    'Recibid un cordial saludo deportivo.'
  ];
  const tabla = [
    ['FECHA', fechaLarga],
    ['HORARIO', hora],
    ['LUGAR', lugar],
    [lista.length > 1 ? 'CATEGORÍAS' : 'CATEGORÍA', categoria || '—'],
    ['ORGANIZA', ORGANIZADOR]
  ];
  const firma = [ORGANIZADOR, `Organización del ${nombreTorneo}`];
  return { nombreTorneo, subtitulo, parrafos, tabla, parrafosCierre, firma };
}

/** Nombre de fichero sin tildes ni espacios. */
function aSlug(nombre) {
  return String(nombre || 'torneo')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'torneo';
}

async function aDataUrl(src) {
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function escribirParrafos(doc, parrafos, yIni) {
  let y = yIni;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(TEXTO);
  const interlinea = 5;
  for (const p of parrafos) {
    const lineas = doc.splitTextToSize(p, anchoTexto);
    lineas.forEach((linea, i) => {
      // Justificado salvo la última línea del párrafo (que queda a la izquierda).
      const align = i < lineas.length - 1 ? 'justify' : 'left';
      doc.text(linea, margen, y, { align, maxWidth: anchoTexto });
      y += interlinea;
    });
    y += 2.5;
  }
  return y;
}

function dibujarTablaDatos(doc, filas, yIni) {
  const altoFila = 8;
  const anchoLabel = 38;
  const alto = filas.length * altoFila;
  doc.setFillColor(243, 245, 249);
  doc.rect(margen, yIni, anchoTexto, alto, 'F');
  doc.setDrawColor(224, 228, 234);
  doc.setLineWidth(0.3);
  doc.rect(margen, yIni, anchoTexto, alto);
  filas.forEach((fila, i) => {
    const fy = yIni + i * altoFila;
    const centro = fy + altoFila / 2 + 1.2;
    if (i > 0) doc.line(margen, fy, anchoA4 - margen, fy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(NAVY);
    doc.text(String(fila[0]), margen + 4, centro);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(TEXTO);
    doc.text(String(fila[1]), margen + anchoLabel, centro);
  });
  return yIni + alto;
}

function dibujarPie(doc) {
  const y = altoA4 - 18;
  doc.setDrawColor(AMARILLO);
  doc.setLineWidth(0.8);
  doc.line(margen, y, anchoA4 - margen, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(NAVY);
  doc.text('ATLÉTICO PALMA DEL RÍO', anchoA4 / 2, y + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(GRIS);
  doc.text('Estadio Sergio León · 14700 - Palma del Río (Córdoba)', anchoA4 / 2, y + 9, { align: 'center' });
}

/** Construye el documento jsPDF (sin guardarlo): sirve para la vista previa y
 * para la descarga. */
export async function crearDocInvitacionTorneo(valores = {}) {
  const inv = construirInvitacion(valores);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const escudo = await aDataUrl(ESCUDO);

  let y = 18;
  const escTam = 26;
  if (escudo) {
    try { doc.addImage(escudo, 'PNG', (anchoA4 - escTam) / 2, y, escTam, escTam); } catch { /* escudo no válido: se omite */ }
  }
  y += escTam + 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(NAVY);
  doc.text('ATLÉTICO PALMA DEL RÍO', anchoA4 / 2, y, { align: 'center' });
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(GRIS);
  doc.text(inv.subtitulo, anchoA4 / 2, y, { align: 'center' });
  y += 5;

  doc.setDrawColor(AMARILLO);
  doc.setLineWidth(1.2);
  doc.line(margen, y, anchoA4 - margen, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(NAVY);
  doc.text('CARTA DE INVITACIÓN', anchoA4 / 2, y, { align: 'center' });
  y += 11;

  y = escribirParrafos(doc, inv.parrafos, y);
  y = dibujarTablaDatos(doc, inv.tabla, y + 2);
  y = escribirParrafos(doc, inv.parrafosCierre, y + 6);

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(NAVY);
  doc.text(inv.firma[0], anchoA4 / 2, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(TEXTO);
  doc.text(inv.firma[1], anchoA4 / 2, y, { align: 'center' });

  dibujarPie(doc);
  return { doc, nombreTorneo: inv.nombreTorneo };
}

/** Genera y descarga el PDF de la carta de invitación. */
export async function generarPdfInvitacionTorneo(valores = {}) {
  const { doc, nombreTorneo } = await crearDocInvitacionTorneo(valores);
  doc.save(`invitacion-${aSlug(nombreTorneo)}-${new Date().toISOString().slice(0, 10)}.pdf`);
  return doc;
}
