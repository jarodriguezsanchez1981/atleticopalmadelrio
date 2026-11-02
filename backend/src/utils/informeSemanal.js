const { Op } = require('sequelize');
const { partesEspana } = require('./horaEspana');

/**
 * Informe semanal (Informes → Semanal): partidos de liga del fin de semana de
 * cada categoría de la temporada actual, con los escudos de los equipos, el
 * resultado, los goles (goleadores del PALMA y minuto; del rival solo el
 * minuto), las tarjetas del PALMA con su minuto y el puesto del PALMA en la
 * última clasificación copiada, en Fútbol 7 y Fútbol 11. Se envía los lunes a las 10:00
 * (utils/informeSemanalAutomatico.js) o a mano desde la pantalla.
 *
 * Un fin de semana se identifica por la fecha de su lunes (YYYY-MM-DD) y va
 * del viernes al domingo anteriores. Solo usa datos de la BD (nada de rfaf.es).
 * Los destinatarios se eligen en la pantalla entre los usuarios activos con
 * email (tabla `informe_semanal_destinatarios`).
 */

const REMITENTE = 'notificaciones@atleticopalmadelrio.com';

const FUTBOL_7 = 1;
const VERDE = '#0B3D2E';

const dosCifras = (n) => String(n).padStart(2, '0');
/** Día (YYYY-MM-DD) desplazado `dias` días de calendario. */
function sumarDias(dia, dias) {
  const [y, m, d] = dia.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}
const formatoDia = (dia) => dia.split('-').reverse().join('/');
const nombreJugador = (j) => `${j?.nombre || ''} ${j?.apellidos || ''}`.trim();

/** "2-1" → { local: 2, visitante: 1 }; null si no hay resultado. */
function golesResultado(resultado) {
  const m = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(String(resultado || ''));
  return m ? { local: Number(m[1]), visitante: Number(m[2]) } : null;
}

// El PALMA (como en clasificacion.controller.js: en RFAF también está "LA
// PALMA C.F."): lleva a la vez "PALMA DEL RIO" y "ATLETICO".
const esPalma = (nombre) => {
  const n = String(nombre || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  return n.includes('PALMA DEL RIO') && n.includes('ATLETICO');
};
/** Día del partido tal y como está guardado (hora española en la BD). */
const diaPartido = (fecha) => new Date(fecha).toISOString().slice(0, 10);
/** "31/10/2026 10:30" de una fecha de partido (hora española guardada como UTC). */
function fechaHora(fecha) {
  const f = new Date(fecha);
  return `${dosCifras(f.getUTCDate())}/${dosCifras(f.getUTCMonth() + 1)}/${f.getUTCFullYear()} `
    + `${dosCifras(f.getUTCHours())}:${dosCifras(f.getUTCMinutes())}`;
}

/** Viernes y domingo del fin de semana anterior al lunes `lunes`. */
function finDeSemana(lunes) {
  return { desde: sumarDias(lunes, -3), hasta: sumarDias(lunes, -1) };
}

/** Lunes (YYYY-MM-DD) de la semana de `ahora`, en hora española. */
function ultimoLunes(ahora = new Date()) {
  const p = partesEspana(ahora);
  const hoy = `${p.y}-${dosCifras(p.m)}-${dosCifras(p.d)}`;
  const diaSemana = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay(); // 0 = domingo
  return sumarDias(hoy, -((diaSemana + 6) % 7));
}

/** true si `texto` es una fecha YYYY-MM-DD válida que cae en lunes. */
function esLunes(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(texto || ''))) return false;
  const [y, m, d] = texto.split('-').map(Number);
  const f = new Date(Date.UTC(y, m - 1, d));
  return f.toISOString().slice(0, 10) === texto && f.getUTCDay() === 1;
}

/** Datos del informe del fin de semana del lunes `lunes`. */
async function construirInforme(lunes) {
  const {
    Temporada, Plantilla, Categoria, Partido, Equipo, Clasificacion, Sancion, Jugador,
    PartidoGol, PartidoGolContra, PartidoTarjeta
  } = require('../models');
  const { desde, hasta } = finDeSemana(lunes);
  const bloques = [{ tipo: 'Fútbol 7', categorias: [] }, { tipo: 'Fútbol 11', categorias: [] }];

  const temporada = await Temporada.findOne({ where: { actual: true }, attributes: ['id'] });
  const plantillas = temporada
    ? await Plantilla.findAll({
      where: { id_temporada: temporada.id },
      attributes: ['id', 'id_categoria'],
      include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'orden', 'id_tipofutbol'] }]
    }) || []
    : [];
  const ids = plantillas.map((p) => p.id);

  // Partidos de liga (con jornada) cuyo día está entre el viernes y el domingo.
  const partidos = ids.length
    ? (await Partido.findAll({
      where: { id_plantilla: ids, fecha: { [Op.between]: [`${desde} 00:00:00`, `${hasta} 23:59:59`] } },
      attributes: ['id', 'id_plantilla', 'jornada', 'fecha', 'resultado', 'suspendido'],
      include: [
        { model: Equipo, as: 'equipoLocal', attributes: ['id', 'nombre', 'escudo'] },
        { model: Equipo, as: 'equipoVisitante', attributes: ['id', 'nombre', 'escudo'] }
      ],
      order: [['fecha', 'ASC']]
    }) || []).filter((p) => Number(p.jornada) > 0 && diaPartido(p.fecha) >= desde && diaPartido(p.fecha) <= hasta)
    : [];

  // Puesto del PALMA: su fila en la jornada más alta copiada de cada plantilla.
  const puestos = new Map();
  if (ids.length) {
    const filas = await Clasificacion.findAll({
      where: { id_plantilla: ids, es_palma: true },
      attributes: ['id_plantilla', 'jornada', 'posicion', 'puntos'],
      order: [['jornada', 'DESC']]
    }) || [];
    for (const f of filas) {
      const actual = puestos.get(f.id_plantilla);
      if (!actual || f.jornada > actual.jornada) {
        puestos.set(f.id_plantilla, { posicion: f.posicion, puntos: f.puntos, jornada: f.jornada });
      }
    }
  }

  // Goles y tarjetas de esos partidos (Finalizar Acta). Del PALMA, con el
  // jugador; del rival, solo el minuto (no está en la BD). Si un partido no
  // tiene tarjetas en el acta, salen las de la tabla Sanciones, sin minuto.
  const idsPartidos = partidos.map((p) => p.id);
  const [goles, golesContra, tarjetas, sanciones] = idsPartidos.length
    ? await Promise.all([
      PartidoGol.findAll({ where: { id_partido: idsPartidos }, attributes: ['id_partido', 'id_jugador', 'minuto', 'tipo'] }),
      PartidoGolContra.findAll({ where: { id_partido: idsPartidos }, attributes: ['id_partido', 'minuto', 'tipo', 'propia'] }),
      PartidoTarjeta.findAll({ where: { id_partido: idsPartidos }, attributes: ['id_partido', 'id_jugador', 'tipo', 'minuto'] }),
      Sancion.findAll({
        where: { id_partido: idsPartidos },
        attributes: ['id_partido', 'amarilla', 'roja'],
        include: [{ model: Jugador, as: 'jugador', attributes: ['nombre', 'apellidos'] }]
      })
    ]).then((r) => r.map((x) => x || []))
    : [[], [], [], []];
  const idsJugadores = [...new Set([...goles, ...tarjetas].map((x) => x.id_jugador).filter(Boolean))];
  const jugadores = idsJugadores.length
    ? await Jugador.findAll({ where: { id: idsJugadores }, attributes: ['id', 'nombre', 'apellidos'] }) || []
    : [];
  const nombreDe = new Map(jugadores.map((j) => [j.id, nombreJugador(j)]));
  const porMinuto = (a, b) => (a.minuto ?? 999) - (b.minuto ?? 999);

  // Goles de los dos equipos y tarjetas del PALMA de un partido, por minuto
  // (los que no tienen minuto, al final). Un gol del rival lleva el nombre del
  // equipo rival (el que no es el PALMA).
  const eventosDe = (x) => {
    const rival = esPalma(x.equipoLocal?.nombre) ? x.equipoVisitante?.nombre : x.equipoLocal?.nombre;
    const golesPalma = goles.filter((g) => g.id_partido === x.id)
      .map((g) => ({ minuto: g.minuto ?? null, tipo: 'gol', jugador: nombreDe.get(g.id_jugador) || '', penalti: g.tipo === 'penalti' }));
    const golesRival = golesContra.filter((g) => g.id_partido === x.id)
      .map((g) => ({ minuto: g.minuto ?? null, tipo: 'gol_rival', equipo: rival || 'Rival', penalti: g.tipo === 'penalti', propia: !!g.propia }));
    let tarjetasPartido = tarjetas.filter((t) => t.id_partido === x.id)
      .map((t) => ({ minuto: t.minuto ?? null, tipo: t.tipo === 'roja' ? 'roja' : 'amarilla', jugador: nombreDe.get(t.id_jugador) || '' }));
    if (!tarjetasPartido.length) {
      tarjetasPartido = sanciones.filter((sa) => sa.id_partido === x.id).flatMap((sa) => {
        const jugador = nombreJugador(sa.jugador);
        return [
          ...Array.from({ length: Number(sa.amarilla) || 0 }, () => ({ minuto: null, tipo: 'amarilla', jugador })),
          ...Array.from({ length: Number(sa.roja) || 0 }, () => ({ minuto: null, tipo: 'roja', jugador }))
        ];
      });
    }
    return [...golesPalma, ...golesRival, ...tarjetasPartido].sort(porMinuto);
  };

  // Escudos (data URL) de los equipos que salen, por id.
  const escudos = {};
  for (const x of partidos) {
    for (const e of [x.equipoLocal, x.equipoVisitante]) if (e?.id && e.escudo) escudos[e.id] = e.escudo;
  }

  const ordenadas = [...plantillas].sort((a, b) => (a.categoria?.orden ?? 0) - (b.categoria?.orden ?? 0));
  for (const p of ordenadas) {
    const suyos = partidos.filter((x) => x.id_plantilla === p.id);
    const bloque = Number(p.categoria?.id_tipofutbol) === FUTBOL_7 ? bloques[0] : bloques[1];
    bloque.categorias.push({
      categoria: p.categoria?.nombre || '',
      partidos: suyos.map((x) => ({
        local: x.equipoLocal?.nombre || '',
        visitante: x.equipoVisitante?.nombre || '',
        idLocal: x.equipoLocal?.id ?? null,
        idVisitante: x.equipoVisitante?.id ?? null,
        fecha: x.fecha,
        resultado: x.resultado || null,
        suspendido: !!x.suspendido,
        golesLocal: golesResultado(x.resultado)?.local ?? null,
        golesVisitante: golesResultado(x.resultado)?.visitante ?? null,
        eventos: eventosDe(x)
      })),
      puesto: puestos.get(p.id) || null
    });
  }

  return { lunes, desde, hasta, hayJornada: partidos.length > 0, escudos, bloques };
}

const escapar = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const COLOR_TARJETA = { amarilla: '#facc15', roja: '#dc2626' };

function textoPuesto(puesto) {
  return puesto ? `${puesto.posicion}º con ${puesto.puntos} puntos (jornada ${puesto.jornada})` : 'Sin clasificación';
}

/** Estado del partido cuando no hay goles que poner (suspendido o sin resultado). */
function textoEstado(p) {
  if (p.suspendido) return 'Suspendido';
  return p.golesLocal == null ? 'Sin resultado' : '';
}

/** Cuadro de color de una tarjeta, como en la web (Estadísticas Tiempo). */
const cuadroTarjeta = (tipo) => `<span style="display:inline-block;width:8px;height:11px;border-radius:2px;`
  + `background:${COLOR_TARJETA[tipo]};vertical-align:middle;" title="Tarjeta ${tipo}"></span>`;

function htmlEscudo(id, srcEscudo) {
  const src = id != null ? srcEscudo(id) : null;
  return src
    ? `<img src="${escapar(src)}" alt="" width="22" height="22" style="width:22px;height:22px;object-fit:contain;vertical-align:middle;">`
    : '';
}

/** "12' ⚽ Ana López (p)", "40' ▮ Ana López", "55' ⚽ RIVAL (pp)". */
function htmlEvento(e) {
  const minuto = e.minuto != null ? `${e.minuto}' ` : '';
  if (e.tipo === 'gol') return `${minuto}⚽ ${escapar(e.jugador)}${e.penalti ? ' (p)' : ''}`;
  if (e.tipo === 'gol_rival') return `${minuto}⚽ ${escapar(e.equipo)}${e.penalti ? ' (p)' : ''}${e.propia ? ' (pp)' : ''}`;
  return `${minuto}${cuadroTarjeta(e.tipo)} ${escapar(e.jugador)}`;
}

/** Un partido: fecha y hora; una fila por equipo (escudo, nombre y goles);
 * debajo, los goles y tarjetas por minuto. */
function htmlPartido(p, srcEscudo) {
  const estado = textoEstado(p);
  const filaEquipo = (nombre, id, goles) => `<tr>
      <td style="padding:3px 6px;width:26px;">${htmlEscudo(id, srcEscudo)}</td>
      <td style="padding:3px 6px;">${escapar(nombre)}</td>
      <td style="padding:3px 6px;width:40px;text-align:center;font-weight:700;font-size:15px;">${goles ?? ''}</td>
    </tr>`;
  const eventos = p.eventos.length
    ? `<tr><td></td><td colspan="2" style="padding:4px 6px 2px;font-size:12px;color:#374151;line-height:1.7;">${p.eventos.map(htmlEvento).join('<br>')}</td></tr>`
    : '';
  return `<table style="border-collapse:collapse;width:100%;font-size:13px;margin:0 0 8px;border:1px solid #e5e7eb;border-radius:6px;">
    <tr><td colspan="3" style="padding:4px 6px;font-size:12px;color:#6b7280;background:#f5f9f6;">
      ${fechaHora(p.fecha)}${estado ? ` · <strong>${estado}</strong>` : ''}
    </td></tr>
    ${filaEquipo(p.local, p.idLocal, p.golesLocal)}
    ${filaEquipo(p.visitante, p.idVisitante, p.golesVisitante)}
    ${eventos}
  </table>`;
}

function htmlCategoria(c, srcEscudo) {
  const partidos = c.partidos.length
    ? c.partidos.map((p) => htmlPartido(p, srcEscudo)).join('')
    : '<p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Sin partido</p>';
  return `<div style="margin:0 0 16px;">
    <h3 style="margin:0 0 6px;font-size:15px;color:${VERDE};">${escapar(c.categoria)}</h3>
    ${partidos}
    <p style="margin:0;font-size:13px;"><strong>Clasificación:</strong> ${textoPuesto(c.puesto)}</p>
  </div>`;
}

/**
 * Asunto y HTML del email (todos los textos de la BD van escapados).
 * `srcEscudo(id)`: src de la imagen del escudo de un equipo (null = sin
 * imagen). Por defecto, su data URL (vista previa en la web); en el email,
 * `cid:` de la imagen adjunta.
 */
function htmlInforme(datos, { srcEscudo = (id) => datos.escudos?.[id] || null } = {}) {
  const asunto = `Informe semanal · fin de semana del ${formatoDia(datos.desde)}`;
  const cuerpo = datos.bloques.filter((b) => b.categorias.length).map((b) => `
    <h2 style="margin:20px 0 8px;padding:6px 10px;font-size:17px;color:#fff;background:${VERDE};border-radius:6px;">${b.tipo}</h2>
    ${b.categorias.map((c) => htmlCategoria(c, srcEscudo)).join('')}`).join('');
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#111827;max-width:720px;">
    <h1 style="margin:0 0 4px;font-size:20px;color:${VERDE};">Informe semanal</h1>
    <p style="margin:0 0 12px;color:#4b5563;">Partidos del fin de semana del ${formatoDia(datos.desde)} al ${formatoDia(datos.hasta)}.</p>
    ${cuerpo || '<p>No hay categorías en la temporada actual.</p>'}
  </div>`;
  return { asunto, html };
}

const conEmail = (u) => !!u && u.activo !== false && u.activo !== 0 && !!String(u.email || '').trim();
const datosUsuario = (u) => ({ id: u.id, nombre: nombreJugador(u), email: String(u.email).trim() });

/** Usuarios activos con email: entre ellos se eligen los destinatarios. */
async function usuariosConEmail() {
  const { Usuario } = require('../models');
  const usuarios = await Usuario.findAll({
    where: { activo: true },
    attributes: ['id', 'nombre', 'apellidos', 'email', 'activo'],
    order: [['nombre', 'ASC'], ['apellidos', 'ASC']]
  }) || [];
  return usuarios.filter(conEmail).map(datosUsuario);
}

/** Destinatarios elegidos que siguen activos y con email. */
async function listaDestinatarios() {
  const { InformeSemanalDestinatario, Usuario } = require('../models');
  const filas = await InformeSemanalDestinatario.findAll({
    include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'apellidos', 'email', 'activo'] }],
    order: [['id', 'ASC']]
  }) || [];
  return filas.map((f) => f.usuario).filter(conEmail).map(datosUsuario);
}

/**
 * Envía el informe del fin de semana de `lunes` desde REMITENTE a los
 * destinatarios elegidos y guarda el envío en `informes_semanales` (correcto
 * o con el error). Sin destinatarios no envía (queda apuntado). No lanza si
 * falla el correo: devuelve la fila con `correcto: false`.
 */
async function enviarInforme({ lunes, automatico, idUsuario = null }) {
  const { InformeSemanal } = require('../models');
  const { enviarDesde } = require('./mailer');
  const { decodificarDataUrl } = require('./imagenes');
  const to = (await listaDestinatarios()).map((d) => d.email).join(', ');
  if (!to) {
    return InformeSemanal.create({
      lunes, automatico: !!automatico, correcto: false, error: 'No hay destinatarios elegidos.', destinatarios: '', id_usuario: idUsuario
    });
  }
  const datos = await construirInforme(lunes);
  // Escudos como imágenes adjuntas (cid): los clientes de correo bloquean las data URL.
  const attachments = [];
  for (const [id, valor] of Object.entries(datos.escudos || {})) {
    const imagen = decodificarDataUrl(valor);
    if (!imagen) continue;
    const extension = imagen.tipoMime.split('/')[1]?.replace('jpeg', 'jpg').replace(/\+.*$/, '') || 'png';
    attachments.push({ filename: `escudo-${id}.${extension}`, content: imagen.buffer, contentType: imagen.tipoMime, cid: `escudo-${id}` });
  }
  const conCid = new Set(attachments.map((a) => a.cid));
  const { asunto, html } = htmlInforme(datos, { srcEscudo: (id) => (conCid.has(`escudo-${id}`) ? `cid:escudo-${id}` : null) });
  let error = null;
  try {
    await enviarDesde(REMITENTE, { to, subject: asunto, html, attachments });
  } catch (err) {
    error = err.message || 'No se pudo enviar el email.';
  }
  return InformeSemanal.create({
    lunes, automatico: !!automatico, correcto: !error, error, destinatarios: to, id_usuario: idUsuario
  });
}

/**
 * Envío automático de los lunes (utils/informeSemanalAutomatico.js): solo si
 * ese fin de semana hubo jornada y aún no se ha enviado bien (p. ej. a mano).
 * Devuelve la fila del envío o null si no tocaba enviar.
 */
async function enviarAutomatico(ahora = new Date()) {
  const { InformeSemanal } = require('../models');
  const lunes = ultimoLunes(ahora);
  const yaEnviado = await InformeSemanal.findOne({ where: { lunes, correcto: true }, attributes: ['id'] });
  if (yaEnviado) return null;
  if (!(await construirInforme(lunes)).hayJornada) return null;
  return enviarInforme({ lunes, automatico: true });
}

module.exports = {
  REMITENTE, finDeSemana, usuariosConEmail, listaDestinatarios, ultimoLunes, esLunes, construirInforme, htmlInforme, enviarInforme, enviarAutomatico
};
