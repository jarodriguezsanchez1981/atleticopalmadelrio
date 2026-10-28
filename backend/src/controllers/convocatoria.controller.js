const { Op } = require('sequelize');
const {
  Convocatoria, ConvocatoriaJugador, ConvocatoriaSinJugador, Temporada, Plantilla, Categoria, Partido,
  Equipo, Jugador, PlantillaJugador, PartidoJugador, Promocion, ConvocatoriaPromocion
} = require('../models');
const { categoriaDelUsuario, includesConCategoria } = require('../utils/filtroCategoria');
const mailer = require('../utils/mailer');
const { partesEspana } = require('../utils/horaEspana');

const PALMA_ID = 73;
// "Enviar Correo" de las convocatorias de Senior A: desde la cuenta de Correos
// con este email, al entrenador.
const CATEGORIA_CORREO = 'Senior A';
const CORREO_REMITENTE = 'convocatoria@atleticopalmadelrio.com';
const CORREO_DESTINATARIO = 'pablo.navarro.corredera@atleticopalmadelrio.com';

const includesBase = [
  { model: Temporada, as: 'temporada', attributes: ['id', 'nombre'] },
  {
    model: Plantilla,
    as: 'plantilla',
    attributes: ['id', 'id_categoria', 'id_temporada'],
    include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'alias'] }]
  },
  {
    model: Partido,
    as: 'partido',
    attributes: ['id', 'fecha', 'jornada', 'id_equipo_local', 'id_equipo_visitante'],
    include: [
      { model: Equipo, as: 'equipoLocal', attributes: ['id', 'nombre', 'escudo'] },
      { model: Equipo, as: 'equipoVisitante', attributes: ['id', 'nombre', 'escudo'] }
    ]
  },
  {
    model: ConvocatoriaJugador,
    as: 'jugadores',
    include: [{ model: Jugador, as: 'jugador', attributes: ['id', 'nombre', 'apellidos', 'foto'] }]
  },
  {
    model: ConvocatoriaSinJugador,
    as: 'noConvocados',
    include: [{ model: Jugador, as: 'jugador', attributes: ['id', 'nombre', 'apellidos', 'foto'] }]
  },
  {
    model: ConvocatoriaPromocion,
    as: 'promocionados',
    include: [{ model: Jugador, as: 'jugador', attributes: ['id', 'nombre', 'apellidos', 'foto'] }]
  }
];

function serialize(convocatoria) {
  return convocatoria.toJSON ? convocatoria.toJSON() : convocatoria;
}

async function listar(req, res, next) {
  try {
    const { id_temporada, id_plantilla, id_partido } = req.query;
    const where = {};
    if (id_temporada) where.id_temporada = id_temporada;
    if (id_plantilla) where.id_plantilla = id_plantilla;
    if (id_partido) where.id_partido = id_partido;

    const items = await Convocatoria.findAll({
      where,
      include: includesConCategoria(includesBase, categoriaDelUsuario(req)),
      order: [['created_at', 'DESC']]
    });
    res.json(items.map(serialize));
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const item = await Convocatoria.findByPk(req.params.id, { include: includesBase });
    if (!item) return res.status(404).json({ message: 'Convocatoria no encontrada.' });
    res.json(serialize(item));
  } catch (err) { next(err); }
}

/** Valida temporada/plantilla/partido y que sean coherentes entre sí. Devuelve
 * el partido cargado (para saber si el PALMA es local o visitante) o un mensaje
 * de error. */
async function validarReferencias({ id_temporada, id_plantilla, id_partido }) {
  if (!id_temporada || !id_plantilla || !id_partido) {
    return { error: 'Temporada, plantilla y partido son obligatorios.' };
  }
  const temporada = await Temporada.findByPk(id_temporada);
  if (!temporada) return { error: 'La temporada indicada no existe.' };

  const plantilla = await Plantilla.findByPk(id_plantilla);
  if (!plantilla) return { error: 'La plantilla indicada no existe.' };
  if (Number(plantilla.id_temporada) !== Number(id_temporada)) {
    return { error: 'La plantilla no pertenece a la temporada indicada.' };
  }

  const partido = await Partido.findByPk(id_partido);
  if (!partido) return { error: 'El partido indicado no existe.' };
  if (Number(partido.id_plantilla) !== Number(id_plantilla)) {
    return { error: 'El partido no pertenece a la plantilla indicada.' };
  }

  return { partido, plantilla };
}

/** Los ids de jugador deben pertenecer a la plantilla convocada. */
async function jugadoresValidos(idPlantilla, idsJugador) {
  if (!idsJugador.length) return true;
  const filas = await PlantillaJugador.findAll({
    where: { id_plantilla: idPlantilla, id_jugador: idsJugador }
  });
  return filas.length === new Set(idsJugador).size;
}

/** Valida los jugadores promocionados desde otras plantillas: misma temporada
 * que la convocatoria, categoría de orden igual o inferior y el jugador debe
 * pertenecer a la plantilla de la que se promociona. Devuelve la lista
 * normalizada ({ id_plantilla, id_jugador }) o un mensaje de error. */
async function validarPromociones(promociones, plantillaDestino) {
  const lista = [];
  const vistos = new Set();
  for (const item of (promociones || [])) {
    const id_plantilla = Number(item?.id_plantilla);
    const id_jugador = Number(item?.id_jugador);
    if (!id_plantilla || !id_jugador) return { error: 'Cada promoción necesita plantilla y jugador.' };
    const clave = `${id_plantilla}-${id_jugador}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    lista.push({ id_plantilla, id_jugador });
  }
  if (!lista.length) return { promociones: [] };

  const categoriaDestino = await Categoria.findByPk(plantillaDestino.id_categoria);
  for (const idPlantilla of new Set(lista.map((p) => p.id_plantilla))) {
    if (idPlantilla === Number(plantillaDestino.id)) {
      return { error: 'No se puede promocionar desde la propia plantilla de la convocatoria.' };
    }
    const origen = await Plantilla.findByPk(idPlantilla, {
      include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'orden'] }]
    });
    if (!origen) return { error: 'La plantilla de promoción indicada no existe.' };
    if (Number(origen.id_temporada) !== Number(plantillaDestino.id_temporada)) {
      return { error: 'La plantilla de promoción debe ser de la misma temporada que la convocatoria.' };
    }
    if (Number(origen.categoria?.orden) > Number(categoriaDestino?.orden)) {
      return { error: 'La plantilla de promoción debe ser de una categoría igual o inferior.' };
    }
    const ids = lista.filter((p) => p.id_plantilla === idPlantilla).map((p) => p.id_jugador);
    if (!(await jugadoresValidos(idPlantilla, ids))) {
      return { error: 'Algún jugador de promoción no pertenece a su plantilla.' };
    }
  }
  return { promociones: lista };
}

/** Limpia y deduplica los lesionados, sancionados y no convocados (los tres
 * van en convocatorias_sin_jugadores, marcados con `lesion` / `sancion`), y
 * quita cualquiera que también esté en la lista de convocados: un jugador
 * convocado no puede figurar a la vez en ninguna de las otras. Si un jugador
 * está en varias, cuenta como lesionado, si no como sancionado. */
function normalizarNoConvocados(noConvocados, idsConvocados, lesionados = [], sancionados = []) {
  const convocadosSet = new Set(idsConvocados);
  const vistos = new Set();
  const resultado = [];
  const agregar = (lista, lesion, sancion) => {
    for (const item of (lista || [])) {
      const id_jugador = Number(item?.id_jugador);
      if (!id_jugador || convocadosSet.has(id_jugador) || vistos.has(id_jugador)) continue;
      vistos.add(id_jugador);
      resultado.push({ id_jugador, observaciones: item.observaciones || null, lesion, sancion });
    }
  };
  agregar(lesionados, true, false);
  agregar(sancionados, false, true);
  agregar(noConvocados, false, false);
  return resultado;
}

/** Da de alta (sin pisar tarjetas/goles ya registrados) a los jugadores
 * convocados como jugadores del partido, del lado en el que juega el PALMA. */
async function sincronizarPartidoJugadores(partido, idsJugador) {
  const esLocal = Number(partido.id_equipo_local) === PALMA_ID;
  for (const idJugador of idsJugador) {
    await PartidoJugador.findOrCreate({
      where: { id_partido: partido.id, id_jugador: idJugador, es_local: esLocal },
      defaults: { id_partido: partido.id, id_jugador: idJugador, es_local: esLocal }
    });
  }
}

async function crear(req, res, next) {
  try {
    const { id_temporada, id_plantilla, id_partido, jugadores, no_convocados, lesionados, sancionados, promociones } = req.body;
    const { error, partido, plantilla } = await validarReferencias({ id_temporada, id_plantilla, id_partido });
    if (error) return res.status(400).json({ message: error });

    const existente = await Convocatoria.findOne({ where: { id_partido } });
    if (existente) return res.status(409).json({ message: 'Este partido ya tiene una convocatoria.' });

    const idsJugador = [...new Set((jugadores || []).map(Number).filter(Boolean))];
    const sinJugador = normalizarNoConvocados(no_convocados, idsJugador, lesionados, sancionados);
    const idsValidar = [...new Set([...idsJugador, ...sinJugador.map((s) => s.id_jugador)])];
    if (!(await jugadoresValidos(id_plantilla, idsValidar))) {
      return res.status(400).json({ message: 'Algún jugador indicado no pertenece a la plantilla.' });
    }
    const promo = await validarPromociones(promociones, plantilla);
    if (promo.error) return res.status(400).json({ message: promo.error });

    const convocatoria = await Convocatoria.create({ id_temporada, id_plantilla, id_partido });
    if (idsJugador.length) {
      await ConvocatoriaJugador.bulkCreate(
        idsJugador.map((id_jugador) => ({ id_convocatoria: convocatoria.id, id_jugador })),
        { ignoreDuplicates: true }
      );
      await sincronizarPartidoJugadores(partido, idsJugador);
    }
    if (sinJugador.length) {
      await ConvocatoriaSinJugador.bulkCreate(
        sinJugador.map((s) => ({ id_convocatoria: convocatoria.id, id_plantilla, id_jugador: s.id_jugador, observaciones: s.observaciones, lesion: s.lesion, sancion: s.sancion })),
        { ignoreDuplicates: true }
      );
    }
    if (promo.promociones.length) {
      await ConvocatoriaPromocion.bulkCreate(
        promo.promociones.map((p) => ({ id_convocatoria: convocatoria.id, id_plantilla: p.id_plantilla, id_jugador: p.id_jugador })),
        { ignoreDuplicates: true }
      );
    }
    // promociones tiene clave única (id_plantilla, id_jugador): si el jugador ya
    // estaba promocionado desde esa plantilla, se deja el registro existente.
    for (const p of promo.promociones) {
      await Promocion.findOrCreate({
        where: { id_plantilla: p.id_plantilla, id_jugador: p.id_jugador },
        defaults: { id_plantilla: p.id_plantilla, id_jugador: p.id_jugador, id_categoria: plantilla.id_categoria }
      });
    }

    const completa = await Convocatoria.findByPk(convocatoria.id, { include: includesBase });
    res.status(201).json(serialize(completa));
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const convocatoria = await Convocatoria.findByPk(req.params.id);
    if (!convocatoria) return res.status(404).json({ message: 'Convocatoria no encontrada.' });

    const { jugadores, no_convocados, lesionados, sancionados } = req.body;
    if ([jugadores, no_convocados, lesionados, sancionados].every((x) => x === undefined)) {
      const completa = await Convocatoria.findByPk(convocatoria.id, { include: includesBase });
      return res.json(serialize(completa));
    }

    const partido = await Partido.findByPk(convocatoria.id_partido);
    const idsJugador = [...new Set((jugadores || []).map(Number).filter(Boolean))];
    const sinJugador = normalizarNoConvocados(no_convocados, idsJugador, lesionados, sancionados);
    const idsValidar = [...new Set([...idsJugador, ...sinJugador.map((s) => s.id_jugador)])];
    if (!(await jugadoresValidos(convocatoria.id_plantilla, idsValidar))) {
      return res.status(400).json({ message: 'Algún jugador indicado no pertenece a la plantilla.' });
    }

    // Se reemplaza la lista completa: no se tocan las filas de partido_jugadores
    // ya creadas (aunque el jugador salga de la convocatoria) para no perder
    // tarjetas/goles ya anotados.
    await ConvocatoriaJugador.destroy({ where: { id_convocatoria: convocatoria.id } });
    if (idsJugador.length) {
      await ConvocatoriaJugador.bulkCreate(
        idsJugador.map((id_jugador) => ({ id_convocatoria: convocatoria.id, id_jugador })),
        { ignoreDuplicates: true }
      );
      await sincronizarPartidoJugadores(partido, idsJugador);
    }

    await ConvocatoriaSinJugador.destroy({ where: { id_convocatoria: convocatoria.id } });
    if (sinJugador.length) {
      await ConvocatoriaSinJugador.bulkCreate(
        sinJugador.map((s) => ({ id_convocatoria: convocatoria.id, id_plantilla: convocatoria.id_plantilla, id_jugador: s.id_jugador, observaciones: s.observaciones, lesion: s.lesion, sancion: s.sancion })),
        { ignoreDuplicates: true }
      );
    }

    const completa = await Convocatoria.findByPk(convocatoria.id, { include: includesBase });
    res.json(serialize(completa));
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const convocatoria = await Convocatoria.findByPk(req.params.id);
    if (!convocatoria) return res.status(404).json({ message: 'Convocatoria no encontrada.' });

    // Un administrador puede eliminar también la de un partido ya jugado.
    const esAdmin = req.user.permisos?.administracion?.editar === true;
    const partido = await Partido.findByPk(convocatoria.id_partido);
    if (!esAdmin && partido && new Date(partido.fecha).getTime() < Date.now()) {
      return res.status(409).json({ message: 'No se puede eliminar la convocatoria de un partido que ya se ha jugado.' });
    }

    // Los promocionados de esta convocatoria también se quitan de promociones,
    // salvo que otra convocatoria siga usando esa misma promoción (la tabla
    // promociones es única por plantilla de origen + jugador).
    const promocionados = await ConvocatoriaPromocion.findAll({ where: { id_convocatoria: convocatoria.id } });
    await convocatoria.destroy();
    for (const p of promocionados) {
      const enOtra = await ConvocatoriaPromocion.count({
        where: { id_plantilla: p.id_plantilla, id_jugador: p.id_jugador, id_convocatoria: { [Op.ne]: convocatoria.id } }
      });
      if (!enOtra) await Promocion.destroy({ where: { id_plantilla: p.id_plantilla, id_jugador: p.id_jugador } });
    }
    res.status(204).send();
  } catch (err) { next(err); }
}

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const escaparHtml = (texto) => String(texto ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Ordena por apellidos y nombre (alfabético en español). */
const porApellidos = (a, b) => `${a.apellidos} ${a.nombre}`.localeCompare(`${b.apellidos} ${b.nombre}`, 'es');

/** Asunto, texto y HTML del correo de una convocatoria (cargada con
 * includesBase): jornada y partido en el asunto; día y hora, convocados
 * (incluidos los de promoción) por orden alfabético, y no convocados,
 * lesionados y sancionados con sus observaciones en el cuerpo. */
function construirCorreoConvocatoria(convocatoria) {
  const partido = convocatoria.partido || {};
  const local = partido.equipoLocal?.nombre || '—';
  const visitante = partido.equipoVisitante?.nombre || '—';
  const enfrentamiento = `${local} - ${visitante}`;
  const subject = partido.jornada ? `Jornada ${partido.jornada}: ${enfrentamiento}` : enfrentamiento;

  const f = partesEspana(partido.fecha);
  const dosCifras = (n) => String(n).padStart(2, '0');
  const diaSemana = DIAS_SEMANA[new Date(Date.UTC(f.y, f.m - 1, f.d)).getUTCDay()];
  const cuando = `${diaSemana} ${dosCifras(f.d)}/${dosCifras(f.m)}/${f.y} a las ${dosCifras(f.h)}:${dosCifras(f.mi)}`;

  const convocados = [
    ...(convocatoria.jugadores || []).map((c) => ({ ...c.jugador })),
    ...(convocatoria.promocionados || []).map((c) => ({ ...c.jugador, promocion: true }))
  ].filter((j) => j.nombre != null).sort(porApellidos);
  const sinConvocar = (filtro) => (convocatoria.noConvocados || [])
    .filter((c) => c.jugador && filtro(c))
    .map((c) => ({ ...c.jugador, observaciones: c.observaciones }))
    .sort(porApellidos);
  const noConvocados = sinConvocar((c) => !c.lesion && !c.sancion);
  const lesionados = sinConvocar((c) => !!c.lesion);
  const sancionados = sinConvocar((c) => !c.lesion && !!c.sancion);
  const lineaTexto = (j) => `- ${nombre(j)}${j.observaciones ? `: ${j.observaciones}` : ''}`;
  const listaHtml = (lista) => (lista.length
    ? `<ul style="margin: 0 0 16px;">${lista.map((j) => `<li>${escaparHtml(nombre(j))}${j.observaciones ? `: <em>${escaparHtml(j.observaciones)}</em>` : ''}</li>`).join('')}</ul>`
    : '<p style="margin: 0 0 16px;">Ninguno</p>');
  const nombre = (j) => `${j.nombre} ${j.apellidos}${j.promocion ? ' (promoción)' : ''}`;

  const text = [
    subject,
    `Fecha: ${cuando}`,
    '',
    `Convocados (${convocados.length}):`,
    ...convocados.map((j, i) => `${i + 1}. ${nombre(j)}`),
    '',
    `No convocados (${noConvocados.length}):`,
    ...(noConvocados.length ? noConvocados.map(lineaTexto) : ['- Ninguno']),
    '',
    `Lesionados (${lesionados.length}):`,
    ...(lesionados.length ? lesionados.map(lineaTexto) : ['- Ninguno']),
    '',
    `Sancionados (${sancionados.length}):`,
    ...(sancionados.length ? sancionados.map(lineaTexto) : ['- Ninguno'])
  ].join('\n');

  const html = `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #1a1a1a;">
<h2 style="color: #0B3D2E; margin: 0 0 4px;">${escaparHtml(subject)}</h2>
<p style="margin: 0 0 16px;"><strong>Fecha:</strong> ${escaparHtml(cuando)}</p>
<h3 style="color: #0B3D2E; margin: 0 0 4px;">Convocados (${convocados.length})</h3>
<ol style="margin: 0 0 16px;">${convocados.map((j) => `<li>${escaparHtml(nombre(j))}</li>`).join('')}</ol>
<h3 style="color: #0B3D2E; margin: 0 0 4px;">No convocados (${noConvocados.length})</h3>
${listaHtml(noConvocados)}
<h3 style="color: #0B3D2E; margin: 0 0 4px;">Lesionados (${lesionados.length})</h3>
${listaHtml(lesionados)}
<h3 style="color: #0B3D2E; margin: 0 0 4px;">Sancionados (${sancionados.length})</h3>
${listaHtml(sancionados)}
</div>`;

  return { subject, text, html };
}

/** "Enviar Correo": manda la convocatoria de Senior A por correo al
 * entrenador desde la cuenta de convocatorias (sección Correos). */
async function enviarCorreo(req, res, next) {
  try {
    const item = await Convocatoria.findByPk(req.params.id, { include: includesBase });
    if (!item) return res.status(404).json({ message: 'Convocatoria no encontrada.' });
    const convocatoria = serialize(item);
    if (convocatoria.plantilla?.categoria?.nombre !== CATEGORIA_CORREO) {
      return res.status(400).json({ message: `Solo se envían por correo las convocatorias de ${CATEGORIA_CORREO}.` });
    }
    const correo = construirCorreoConvocatoria(convocatoria);
    try {
      await mailer.enviarDesde(CORREO_REMITENTE, { to: CORREO_DESTINATARIO, ...correo });
    } catch (err) {
      if (err.sinCuenta) return res.status(400).json({ message: err.message });
      console.error('Convocatorias: no se pudo enviar el correo:', err.message);
      return res.status(502).json({ message: 'No se pudo enviar el correo. Revisa la cuenta de convocatorias en Correos.' });
    }
    res.json({ message: `Correo enviado a ${CORREO_DESTINATARIO}.` });
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar, enviarCorreo, construirCorreoConvocatoria };
