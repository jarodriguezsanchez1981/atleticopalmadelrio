import { jsPDF } from 'jspdf';
import { utilService } from '../services';
import { generarCategoria, nombreCampo, CAMPOS } from './generarTorneo';

/**
 * PDF de un torneo generado (sección Generar Torneo): una hoja por categoría
 * con el escudo del club, los datos, los grupos, el horario de partidos
 * (hora × campo) y una clasificación vacía para rellenar a mano. Los equipos
 * llevan su escudo en los grupos, en los partidos de grupos y en la
 * clasificación (en las eliminatorias aún no se sabe quién juega).
 * `construirHojasTorneo` arma el contenido (función pura, testeable) y
 * `descargarPdfTorneo` lo dibuja con jsPDF.
 */

const VERDE = '#0F3D22';
const VERDE_CLARO = '#CFE2D6';
const VERDE_SUAVE = '#E3EEE7';
const FILA_ALTERNA = '#F5F9F6';
const ORO = '#A07800';
const PLATA = '#6B7280';
const TEXTO = '#1F2937';
const ESCUDO = '/escudo.png';

const anchoA4 = 210;
const altoA4 = 297;
const margen = 14;
const anchoUtil = anchoA4 - margen * 2;

const NOMBRE_FASE = { grupos: 'Fase de grupos', semifinales: 'Semifinales', finales: 'Finales' };

const hhmm = (hora) => String(hora || '').slice(0, 5);

function aFecha(valor) {
  const [a, m, d] = String(valor || '').slice(0, 10).split('-');
  return a && m && d ? `${d}/${m}/${a}` : '';
}

function textoPartido(p) {
  const cruce = `${p.local} – ${p.visitante}`;
  if (p.etiqueta) return `${p.etiqueta}: ${cruce}`;
  return p.grupo ? `${cruce} (${p.grupo})` : cruce;
}

/** Celda de un partido: en grupos, cada equipo en su línea (con su escudo);
 * en eliminatorias, una línea de texto. */
function celdaPartido(p) {
  if (p.etiqueta) return { lineas: [{ texto: textoPartido(p) }] };
  return {
    lineas: [
      { texto: p.local, equipo: p.local },
      { texto: p.grupo ? `${p.visitante} (${p.grupo})` : p.visitante, equipo: p.visitante }
    ]
  };
}

function textoFormato(cat) {
  const partes = [cat.formato === 'grupos' ? '2 grupos' : 'Todos contra todos'];
  if (cat.formato === 'grupos' && cat.semifinales) partes.push('Semifinales');
  const finales = [cat.final_oro && 'Oro', cat.final_plata && 'Plata'].filter(Boolean);
  if (finales.length) partes.push(`Final ${finales.join(' y ')}`);
  return partes.join(' · ');
}

/** Contenido de cada hoja del PDF (una por categoría). */
export function construirHojasTorneo(torneo) {
  return (torneo.categorias || []).map((cat) => {
    const { turnos } = generarCategoria(cat);
    // Columnas: los campos elegidos, en el orden fijo de CAMPOS.
    const usados = CAMPOS.map((c) => c.clave).filter((c) => (cat.campos || []).includes(c));
    const filas = [];
    let faseActual = null;
    for (const t of turnos) {
      if (t.fase !== faseActual) {
        faseActual = t.fase;
        filas.push({ fase: cat.formato === 'liga' && t.fase === 'grupos' ? 'Todos contra todos' : NOMBRE_FASE[t.fase] });
      }
      // Turno vacío: descanso obligatorio para que nadie juegue dos turnos seguidos.
      if (!t.partidos.length) {
        filas.push([hhmm(t.hora), 'Descanso', ...usados.slice(1).map(() => '')]);
        continue;
      }
      filas.push([hhmm(t.hora), ...usados.map((c) => {
        const p = t.partidos.find((x) => x.campo === c);
        return p ? celdaPartido(p) : '';
      })]);
    }

    const nombres = (g) => (cat.equipos || []).filter((e) => e.grupo === g).map((e) => e.nombre);
    const grupos = cat.formato === 'grupos'
      ? { A: nombres('A'), B: nombres('B') }
      : { todos: (cat.equipos || []).map((e) => e.nombre) };

    const descanso = Number(cat.descanso_min) || 0;
    return {
      titulo: torneo.nombre,
      subtitulo: `Atlético Palma del Río · Categoría ${cat.categoria?.nombre || ''} (Fútbol 7)`,
      datos: [
        ['Fecha', aFecha(torneo.fecha)],
        ['Horario', cat.hora_fin ? `${hhmm(cat.hora_inicio)} – ${hhmm(cat.hora_fin)}` : hhmm(cat.hora_inicio)],
        ['Lugar', usados.map(nombreCampo).join(', ')],
        ['Partidos', descanso ? `${cat.duracion_min}' + ${descanso}' descanso` : `${cat.duracion_min}'`],
        ['Formato', textoFormato(cat)]
      ],
      grupos,
      // Nombre en el torneo -> escudo del equipo (URL o data URL), si tiene.
      escudos: Object.fromEntries((cat.equipos || []).map((e) => [e.nombre, e.equipo?.escudo || null])),
      columnas: ['Hora', ...usados.map(nombreCampo)],
      filas,
      observaciones: torneo.observaciones || ''
    };
  });
}

async function aDataUrl(src) {
  if (!src) return null;
  if (String(src).startsWith('data:')) return src;
  try {
    // Escudos guardados como URL externa: por el proxy del backend (CORS).
    if (/^https?:\/\//i.test(src)) return (await utilService.imagen(src))?.dataUrl || null;
    const res = await fetch(src);
    if (!res.ok) return null;
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

// Cada escudo se procesa una sola vez por documento: sus medidas y un alias con
// el que jsPDF reutiliza la imagen ya incrustada (si no, cada dibujo la vuelve
// a decodificar y a meter en el PDF).
const imagenesPorDoc = new WeakMap();

/** Escudo de un equipo encajado en un cuadrado de `lado` mm, sin deformarlo. */
function dibujarEscudoEquipo(doc, dataUrl, x, y, lado) {
  if (!dataUrl) return;
  if (!imagenesPorDoc.has(doc)) imagenesPorDoc.set(doc, new Map());
  const cache = imagenesPorDoc.get(doc);
  try {
    if (!cache.has(dataUrl)) {
      const { width, height } = doc.getImageProperties(dataUrl);
      cache.set(dataUrl, { width, height, alias: `escudo_${cache.size}`, formato: /^data:image\/jpe?g/i.test(dataUrl) ? 'JPEG' : 'PNG' });
    }
    const { width, height, alias, formato } = cache.get(dataUrl);
    const escala = lado / Math.max(width, height, 1);
    const an = width * escala;
    const al = height * escala;
    doc.addImage(dataUrl, formato, x + (lado - an) / 2, y + (lado - al) / 2, an, al, alias, 'FAST');
  } catch { /* escudo no válido: se omite sin romper el PDF */ }
}

function aSlug(nombre) {
  return String(nombre || 'torneo')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'torneo';
}

/** Cabecera de la hoja: escudo, nombre del torneo (en varias líneas si es
 * largo) y categoría. Devuelve la y siguiente. */
function dibujarCabecera(doc, hoja, escudo) {
  const y0 = margen;
  const xTexto = margen + 23;
  const anchoTexto = anchoA4 - margen - xTexto;
  if (escudo) {
    try { doc.addImage(escudo, 'PNG', margen, y0, 18, 20, 'escudo_club', 'FAST'); } catch { /* escudo no válido: se omite */ }
  }
  doc.setTextColor(VERDE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  const titulo = doc.splitTextToSize(hoja.titulo, anchoTexto);
  doc.text(titulo, xTexto, y0 + 8);
  let y = y0 + 8 + (titulo.length - 1) * 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(TEXTO);
  const subtitulo = doc.splitTextToSize(hoja.subtitulo, anchoTexto);
  doc.text(subtitulo, xTexto, y + 7);
  y = Math.max(y0 + 23, y + 7 + (subtitulo.length - 1) * 4.5 + 4);
  doc.setDrawColor(VERDE);
  doc.setLineWidth(0.9);
  doc.line(margen, y, anchoA4 - margen, y);
  return y + 5;
}

/** Recuadros de datos (3 por fila). Cada valor se dibuja entero, en varias
 * líneas si hace falta; la fila toma el alto del recuadro más alto. */
function dibujarDatos(doc, datos, y) {
  const porFila = 3;
  const ancho = (anchoUtil - (porFila - 1) * 3) / porFila;
  doc.setFontSize(9);
  const lineas = datos.map(([, valor]) => doc.splitTextToSize(valor || '—', ancho - 5));
  for (let f = 0; f < datos.length; f += porFila) {
    const altoFila = 8 + Math.max(...lineas.slice(f, f + porFila).map((l) => l.length)) * 4;
    datos.slice(f, f + porFila).forEach(([etiqueta], k) => {
      const x = margen + k * (ancho + 3);
      doc.setFillColor(VERDE_SUAVE);
      doc.roundedRect(x, y, ancho, altoFila, 1.5, 1.5, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(VERDE);
      doc.text(etiqueta.toUpperCase(), x + 2.5, y + 4.2);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(TEXTO);
      doc.text(lineas[f + k], x + 2.5, y + 9.3);
    });
    y += altoFila + 2;
  }
  return y;
}

function tituloSeccion(doc, texto, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(VERDE);
  doc.text(texto, margen, y + 4);
  return y + 7;
}

const LADO_ESCUDO = 3.8;
const ALTO_LINEA = 3.7;

/** Celda -> { lineas: [{ texto, equipo? }] } (los textos sueltos son una línea). */
const normalizarCelda = (c) => (c && typeof c === 'object' ? c : { lineas: [{ texto: String(c ?? '') }] });

/**
 * Tabla genérica: `filas` son arrays de celdas o { fase } (fila separadora).
 * Una celda es un texto o { lineas: [{ texto, equipo? }] }; si la línea es de
 * un equipo con escudo en `escudos`, se dibuja delante del nombre.
 * Salta de página si no cabe y repite la cabecera. Devuelve la y siguiente.
 */
function dibujarTabla(doc, { x = margen, ancho = anchoUtil, columnas, anchos, filas, alto = 6.5, escudos = {} }, y) {
  const pad = 1.8;
  const cabecera = (yy) => {
    doc.setFillColor(VERDE);
    doc.rect(x, yy, ancho, alto, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor('#FFFFFF');
    let cx = x;
    columnas.forEach((c, i) => { doc.text(c, cx + pad, yy + alto - 2); cx += anchos[i]; });
    return yy + alto;
  };
  y = cabecera(y);
  let alterna = 0;
  filas.forEach((fila) => {
    if (!Array.isArray(fila)) {
      if (y + alto * 2 > altoA4 - margen) { doc.addPage(); y = cabecera(margen); }
      doc.setFillColor(VERDE_CLARO);
      doc.rect(x, y, ancho, alto, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(VERDE);
      doc.text(fila.fase, x + pad, y + alto - 2);
      y += alto;
      alterna = 0;
      return;
    }
    doc.setFontSize(8.5);
    // Por celda, sus líneas ya partidas al ancho (descontando el escudo).
    const celdas = fila.map((c, i) => normalizarCelda(c).lineas.map((l) => {
      const escudo = l.equipo ? escudos[l.equipo] : null;
      const sangria = escudo ? LADO_ESCUDO + 1 : 0;
      return { ...l, escudo, sangria, partes: doc.splitTextToSize(l.texto, anchos[i] - pad * 2 - sangria) };
    }));
    const lineasCelda = (c) => c.reduce((n, l) => n + l.partes.length, 0);
    const altoFila = Math.max(alto, Math.max(...celdas.map(lineasCelda)) * ALTO_LINEA + 2.8);
    if (y + altoFila > altoA4 - margen) { doc.addPage(); y = cabecera(margen); alterna = 0; }
    if (alterna++ % 2) { doc.setFillColor(FILA_ALTERNA); doc.rect(x, y, ancho, altoFila, 'F'); }
    let cx = x;
    celdas.forEach((lineas, i) => {
      const primera = lineas[0]?.texto || '';
      const esOro = primera.startsWith('ORO:');
      const esPlata = primera.startsWith('PLATA:');
      doc.setFont('helvetica', esOro || esPlata || i === 0 ? 'bold' : 'normal');
      doc.setTextColor(esOro ? ORO : esPlata ? PLATA : TEXTO);
      let ly = y + 4.5;
      for (const l of lineas) {
        if (l.escudo) dibujarEscudoEquipo(doc, l.escudo, cx + pad, ly - 3, LADO_ESCUDO);
        if (l.partes.length) doc.text(l.partes, cx + pad + l.sangria, ly);
        ly += l.partes.length * ALTO_LINEA;
      }
      cx += anchos[i];
    });
    doc.setDrawColor('#E5E7EB');
    doc.setLineWidth(0.2);
    doc.line(x, y + altoFila, x + ancho, y + altoFila);
    y += altoFila;
  });
  return y + 4;
}

function asegurarEspacio(doc, y, necesario) {
  if (y + necesario > altoA4 - margen) { doc.addPage(); return margen; }
  return y;
}

const celdaEquipo = (nombre) => ({ lineas: [{ texto: nombre, equipo: nombre }] });

function dibujarGrupos(doc, grupos, escudos, y) {
  if (grupos.todos) {
    y = tituloSeccion(doc, 'Equipos', y);
    return dibujarTabla(doc, { columnas: ['Equipo'], anchos: [anchoUtil], filas: grupos.todos.map((n) => [celdaEquipo(n)]), escudos }, y);
  }
  y = tituloSeccion(doc, 'Grupos', y);
  const ancho = (anchoUtil - 4) / 2;
  const yA = dibujarTabla(doc, { x: margen, ancho, columnas: ['Grupo A'], anchos: [ancho], filas: grupos.A.map((n) => [celdaEquipo(n)]), escudos }, y);
  const yB = dibujarTabla(doc, { x: margen + ancho + 4, ancho, columnas: ['Grupo B'], anchos: [ancho], filas: grupos.B.map((n) => [celdaEquipo(n)]), escudos }, y);
  return Math.max(yA, yB);
}

function dibujarClasificacion(doc, grupos, escudos, y) {
  const listas = grupos.todos ? [['Clasificación', grupos.todos]] : [['Grupo A', grupos.A], ['Grupo B', grupos.B]];
  y = asegurarEspacio(doc, y, 30);
  y = tituloSeccion(doc, 'Clasificación (para rellenar)', y);
  const anchos = [anchoUtil - 6 * 14, 14, 14, 14, 14, 14, 14];
  for (const [titulo, equipos] of listas) {
    y = asegurarEspacio(doc, y, 6.5 * (equipos.length + 2));
    y = dibujarTabla(doc, {
      columnas: [titulo, 'PJ', 'G', 'E', 'P', 'Dif.', 'Pts'],
      anchos,
      filas: equipos.map((n) => [celdaEquipo(n), '', '', '', '', '', '']),
      escudos
    }, y);
  }
  return y;
}

/** Dibuja el torneo en `doc` (una hoja por categoría). `escudo`: el del club;
 * `escudosEquipos`: nombre en el torneo -> data URL del escudo. */
export function dibujarTorneo(doc, torneo, escudo, escudosEquipos = {}) {
  const hojas = construirHojasTorneo(torneo);
  hojas.forEach((hoja, i) => {
    if (i) doc.addPage();
    let y = dibujarCabecera(doc, hoja, escudo);
    y = dibujarDatos(doc, hoja.datos, y);
    y = dibujarGrupos(doc, hoja.grupos, escudosEquipos, y);
    y = asegurarEspacio(doc, y, 30);
    y = tituloSeccion(doc, 'Horario de partidos', y);
    const anchoHora = 16;
    const resto = (anchoUtil - anchoHora) / Math.max(hoja.columnas.length - 1, 1);
    y = dibujarTabla(doc, {
      columnas: hoja.columnas,
      anchos: [anchoHora, ...hoja.columnas.slice(1).map(() => resto)],
      filas: hoja.filas,
      escudos: escudosEquipos
    }, y);
    y = dibujarClasificacion(doc, hoja.grupos, escudosEquipos, y);
    if (hoja.observaciones) {
      y = asegurarEspacio(doc, y, 20);
      y = tituloSeccion(doc, 'Observaciones', y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(TEXTO);
      doc.text(doc.splitTextToSize(hoja.observaciones, anchoUtil), margen, y + 3);
    }
  });
}

/** Descarga una vez cada escudo distinto: nombre en el torneo -> data URL. */
async function cargarEscudosEquipos(torneo) {
  const porNombre = Object.assign({}, ...construirHojasTorneo(torneo).map((h) => h.escudos));
  const fuentes = [...new Set(Object.values(porNombre).filter(Boolean))];
  const cargadas = Object.fromEntries(await Promise.all(fuentes.map(async (src) => [src, await aDataUrl(src)])));
  return Object.fromEntries(Object.entries(porNombre).map(([nombre, src]) => [nombre, src ? cargadas[src] : null]));
}

export async function crearDocTorneo(torneo) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const [escudo, escudosEquipos] = await Promise.all([aDataUrl(ESCUDO), cargarEscudosEquipos(torneo)]);
  dibujarTorneo(doc, torneo, escudo, escudosEquipos);
  return doc;
}

export async function descargarPdfTorneo(torneo) {
  const doc = await crearDocTorneo(torneo);
  doc.save(`torneo-${aSlug(torneo.nombre)}.pdf`);
}
