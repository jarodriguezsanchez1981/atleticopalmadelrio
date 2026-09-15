/**
 * Para cada jornada ya jugada de cada plantilla del PALMA DEL RIO ATLETICO C.F.
 * consulta el acta (CodActa) en la web de la RFAF y la guarda en partidos.codigo_acta.
 *
 * Uso: node src/utils/actualizarCodigoActa.js
 */
require('dotenv').config();
const { Op } = require('sequelize');
const { Partido, Plantilla, Jornada, Categoria } = require('../models');

const BASE_URL = 'https://www.rfaf.es/pnfg/NPcd/NFG_CmpJornada';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

/** La RFAF exige sesión: la primera petición redirige a /NLogin (que fija la
 * cookie JSESSIONID) y desde ahí vuelve a la URL original ya con sesión válida. */
async function fetchConCookies(url) {
  const cookieJar = new Map();
  let current = url;
  for (let hop = 0; hop < 6; hop++) {
    const cookieHeader = Array.from(cookieJar, ([k, v]) => `${k}=${v}`).join('; ');
    const res = await fetch(current, {
      redirect: 'manual',
      headers: {
        'User-Agent': USER_AGENT,
        ...(cookieHeader ? { Cookie: cookieHeader } : {})
      }
    });
    const setCookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
    for (const sc of setCookies) {
      const [pair] = sc.split(';');
      const [k, v] = pair.split('=');
      if (k) cookieJar.set(k.trim(), (v || '').trim());
    }
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get('location');
      if (!loc) throw new Error(`Redirección sin Location (status ${res.status})`);
      current = new URL(loc, current).toString();
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return { status: res.status, text: buf.toString('latin1') };
  }
  throw new Error('Demasiadas redirecciones al consultar RFAF');
}

/** Cada partido de la jornada es una <tr> con los dos Codigo_Equipo y, si ya se
 * jugó, un enlace con CodActa. undefined = el equipo no aparece en la jornada;
 * null = aparece pero el acta todavía no se ha publicado. */
function extraerCodActa(html, codigoEquipo) {
  const filas = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || [];
  for (const fila of filas) {
    const equipos = Array.from(fila.matchAll(/Codigo_Equipo=(\d+)/g)).map((m) => m[1]);
    if (equipos.includes(String(codigoEquipo))) {
      const acta = fila.match(/CodActa=(\d+)&cod_acta/);
      return acta ? acta[1] : null;
    }
  }
  return undefined;
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function actualizarCodigoActa() {
  const plantillas = await Plantilla.findAll({
    include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'alias'] }]
  });

  let actualizados = 0;
  let sinActaTodavia = 0;
  let noEncontrados = 0;
  let errores = 0;

  for (const plantilla of plantillas) {
    if (!plantilla.codigo_equipo || !plantilla.codigo_competicion || !plantilla.codigo_grupo || !plantilla.codigo_temporada) {
      continue;
    }

    const partidos = await Partido.findAll({
      where: { id_plantilla: plantilla.id, codigo_acta: null, fecha: { [Op.lt]: new Date() } },
      include: [{ model: Jornada, as: 'jornadaRef', attributes: ['id', 'jornada'] }]
    });
    const pendientes = partidos.filter((p) => p.jornadaRef && p.jornadaRef.jornada != null);
    if (!pendientes.length) continue;

    const nombreCategoria = plantilla.categoria?.alias || plantilla.categoria?.nombre || `plantilla ${plantilla.id}`;

    for (const partido of pendientes) {
      const jornadaNum = partido.jornadaRef.jornada;
      const url = `${BASE_URL}?cod_primaria=${plantilla.codigo_primaria}&CodCompeticion=${plantilla.codigo_competicion}&CodGrupo=${plantilla.codigo_grupo}&CodTemporada=${plantilla.codigo_temporada}&CodJornada=${jornadaNum}`;
      try {
        const { text } = await fetchConCookies(url);
        const codActa = extraerCodActa(text, plantilla.codigo_equipo);
        if (codActa === undefined) {
          console.log(`[sin encontrar] ${nombreCategoria} · jornada ${jornadaNum}: equipo ${plantilla.codigo_equipo} no aparece en la página RFAF.`);
          noEncontrados += 1;
        } else if (codActa === null) {
          console.log(`[sin acta aún] ${nombreCategoria} · jornada ${jornadaNum}: partido sin acta publicada todavía.`);
          sinActaTodavia += 1;
        } else {
          partido.codigo_acta = codActa;
          await partido.save();
          console.log(`[actualizado] ${nombreCategoria} · jornada ${jornadaNum}: codigo_acta = ${codActa}`);
          actualizados += 1;
        }
      } catch (err) {
        console.error(`[error] ${nombreCategoria} · jornada ${jornadaNum}: ${err.message}`);
        errores += 1;
      }
      await esperar(400);
    }
  }

  console.log('\n--- Resumen ---');
  console.log(`Actualizados: ${actualizados}`);
  console.log(`Sin acta todavía: ${sinActaTodavia}`);
  console.log(`No encontrados en RFAF: ${noEncontrados}`);
  console.log(`Errores: ${errores}`);
}

if (require.main === module) {
  actualizarCodigoActa()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error fatal:', err);
      process.exit(1);
    });
}

module.exports = { actualizarCodigoActa, extraerCodActa, fetchConCookies };
