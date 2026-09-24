const cheerio = require('cheerio');

const BASE_URL = 'https://www.rfaf.es';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
};

function urlActa(codigoPrimaria, codigoActa) {
  const params = new URLSearchParams({ cod_primaria: codigoPrimaria, CodActa: codigoActa });
  return `${BASE_URL}/pnfg/NPcd/NFG_CmpPartido?${params.toString()}`;
}

/** Descarga el HTML del acta. RFAF suele devolver un 302 a /pnfg/NLogin cuando
 * la petición no parece venir de un navegador normal (sin cookies de sesión
 * previas); por eso primero se visita la home para obtener cookies y luego
 * se pide el acta con esas cookies y un Referer plausible. */
async function descargarActaHtml(codigoPrimaria, codigoActa) {
  if (!codigoPrimaria || !codigoActa) {
    throw new Error('Faltan codigo_primaria o codigo_acta.');
  }

  const jar = new Map();
  const aplicarSetCookie = (headers) => {
    const raw = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : headers.get('set-cookie');
    const lista = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    for (const linea of lista) {
      const [par] = linea.split(';');
      const [nombre, valor] = par.split('=');
      if (nombre) jar.set(nombre.trim(), (valor || '').trim());
    }
  };
  const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');

  const home = await fetch(BASE_URL, { headers: HEADERS, redirect: 'manual' });
  aplicarSetCookie(home.headers);

  const target = urlActa(codigoPrimaria, codigoActa);
  const res = await fetch(target, {
    headers: { ...HEADERS, Cookie: cookieHeader(), Referer: `${BASE_URL}/pnfg/NPcd/NFG_LstDirectorioEquipos` },
    redirect: 'manual'
  });

  if (res.status >= 300 && res.status < 400) {
    throw new Error('RFAF ha pedido iniciar sesión para ver esta acta (redirección a NLogin). No se puede importar automáticamente.');
  }
  if (!res.ok) {
    throw new Error(`RFAF respondió ${res.status} al pedir el acta.`);
  }

  const html = await res.text();
  if (html.toLowerCase().includes('/nlogin') || html.length < 200) {
    throw new Error('RFAF ha devuelto una página de login o vacía. No se puede importar automáticamente.');
  }
  return html;
}

function limpiar(texto) {
  return (texto || '').replace(/\s+/g, ' ').trim();
}

/** "PÉREZ GÓMEZ, JUAN" -> "PEREZ GOMEZ JUAN", para poder comparar nombres
 * de RFAF (con acentos/orden distinto) con los de nuestra base de datos. */
function normalizarNombre(texto) {
  return limpiar(texto)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Busca, dentro del HTML del acta, el bloque de estadísticas
 * (div.dashboard-stat) del equipo cuyo nombre coincide con `nombreEquipo`. */
function bloqueEquipo($, nombreEquipo) {
  const objetivo = normalizarNombre(nombreEquipo);
  let bloque = null;
  $('.dashboard-stat').each((_, el) => {
    const nombre = normalizarNombre($(el).find('.number').first().text());
    if (nombre === objetivo) {
      bloque = $(el);
      return false;
    }
  });
  return bloque;
}

/** Filas de una tabla de convocados (dorsal + nombre), bajo el <h5> indicado
 * ("Titulares" o "Suplentes") dentro del bloque del equipo. */
function filasConvocados($, bloque, etiqueta) {
  const filas = [];
  const h5 = bloque.find('h5').filter((_, el) => limpiar($(el).text()) === etiqueta).first();
  if (!h5.length) return filas;
  const tabla = h5.nextAll('table').first();
  tabla.find('tr').each((_, tr) => {
    const tds = $(tr).find('td');
    if (tds.length < 3) return;
    const dorsalTxt = limpiar($(tds[0]).text());
    const nombre = limpiar($(tds[2]).text());
    if (!nombre) return;
    const dorsal = Number(dorsalTxt);
    filas.push({ dorsal: Number.isFinite(dorsal) ? dorsal : null, nombre, nombreNormalizado: normalizarNombre(nombre) });
  });
  return filas;
}

/** Tarjetas del equipo: icono tarj_amar.gif = amarilla, tarj_roja*.gif = roja. */
function filasTarjetas($, bloque) {
  const filas = [];
  const h4 = bloque.find('h4').filter((_, el) => limpiar($(el).text()) === 'Tarjetas').first();
  if (!h4.length) return filas;
  const tabla = h4.nextAll('table').first();
  tabla.find('tr').each((_, tr) => {
    const tds = $(tr).find('td');
    if (tds.length < 2) return;
    const src = $(tds[0]).find('img').attr('src') || '';
    const tipo = src.includes('tarj_roja') ? 'roja' : (src.includes('tarj_amar') ? 'amarilla' : null);
    if (!tipo) return;
    const nombre = limpiar($(tds[1]).clone().find('span').remove().end().text());
    const minutoTxt = limpiar($(tds[1]).find('span').first().text()); // "(22')"
    const minuto = Number((minutoTxt.match(/\d+/) || [])[0]) || null;
    if (!nombre) return;
    filas.push({ tipo, nombre, nombreNormalizado: normalizarNombre(nombre), minuto });
  });
  return filas;
}

/** Goles del PARTIDO ENTERO (la tabla no distingue equipo; hay que cruzar el
 * nombre con la lista de convocados de cada equipo para saber de quién es).
 * `color` del icono: verde = gol normal, azul = de penalti, rojo = en propia
 * puerta (no se cuenta como gol a favor del jugador). */
function filasGoles($) {
  const filas = [];
  $('div.number').filter((_, el) => limpiar($(el).text()) === 'Goles').each((_, div) => {
    const tabla = $(div).parent().find('table.table').first();
    tabla.find('tr').each((_, tr) => {
      const tds = $(tr).find('td');
      if (tds.length < 2) return;
      const icono = $(tds[0]).find('i.fa-futbol, i.fa-solid').first();
      const color = (icono.attr('style') || '').replace(/\s+/g, '').toLowerCase();
      let tipo = 'normal';
      if (color.includes('color:red')) tipo = 'propia';
      else if (color.includes('color:#0fa020')) tipo = 'normal';
      else if (color.includes('color:rgb(21,114,228)') || color.includes('color:#1572e4')) tipo = 'penalti';
      const nombre = limpiar($(tds[1]).clone().find('span').remove().end().text());
      const minutoTxt = limpiar($(tds[1]).find('span').first().text());
      const minuto = Number((minutoTxt.match(/\d+/) || [])[0]) || null;
      if (!nombre) return;
      filas.push({ tipo, nombre, nombreNormalizado: normalizarNombre(nombre), minuto });
    });
  });
  return filas;
}

/** Parsea el acta y devuelve, solo para `nombreEquipo`, convocados (titular/
 * suplente) con sus tarjetas y goles ya contados. */
function parsearActa(html, nombreEquipo) {
  const $ = cheerio.load(html);
  const bloque = bloqueEquipo($, nombreEquipo);
  if (!bloque) {
    throw new Error(`No se encontró en el acta al equipo "${nombreEquipo}".`);
  }

  const titulares = filasConvocados($, bloque, 'Titulares').map((j) => ({ ...j, titular: true }));
  const suplentes = filasConvocados($, bloque, 'Suplentes').map((j) => ({ ...j, titular: false }));
  const convocados = [...titulares, ...suplentes];

  const tarjetas = filasTarjetas($, bloque);
  const golesEquipo = filasGoles($).filter((g) => convocados.some((j) => j.nombreNormalizado === g.nombreNormalizado));

  const jugadores = convocados.map((j) => ({
    dorsal: j.dorsal,
    nombre: j.nombre,
    nombreNormalizado: j.nombreNormalizado,
    titular: j.titular,
    tarjeta_amarilla: tarjetas.filter((t) => t.nombreNormalizado === j.nombreNormalizado && t.tipo === 'amarilla').length,
    tarjeta_roja: tarjetas.filter((t) => t.nombreNormalizado === j.nombreNormalizado && t.tipo === 'roja').length,
    goles: golesEquipo.filter((g) => g.nombreNormalizado === j.nombreNormalizado && g.tipo !== 'propia').length
  }));

  return { jugadores };
}

module.exports = { urlActa, descargarActaHtml, parsearActa, normalizarNombre };
