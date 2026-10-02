const { Op } = require('sequelize');
const {
  Convocatoria, ConvocatoriaJugador, ConvocatoriaSinJugador, Temporada, Plantilla, Categoria, Partido,
  Equipo, Jugador, PlantillaJugador, PartidoJugador, Promocion, ConvocatoriaPromocion
} = require('../models');
const { categoriaDelUsuario, includesConCategoria } = require('../utils/filtroCategoria');

const PALMA_ID = 73;

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

/** Limpia y deduplica la lista de no convocados, y quita cualquiera que
 * también esté en la lista de convocados: un jugador convocado no puede
 * figurar a la vez como no convocado. */
function normalizarNoConvocados(noConvocados, idsConvocados) {
  const convocadosSet = new Set(idsConvocados);
  const vistos = new Set();
  const resultado = [];
  for (const item of (noConvocados || [])) {
    const id_jugador = Number(item?.id_jugador);
    if (!id_jugador || convocadosSet.has(id_jugador) || vistos.has(id_jugador)) continue;
    vistos.add(id_jugador);
    resultado.push({ id_jugador, observaciones: item.observaciones || null });
  }
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
    const { id_temporada, id_plantilla, id_partido, jugadores, no_convocados, promociones } = req.body;
    const { error, partido, plantilla } = await validarReferencias({ id_temporada, id_plantilla, id_partido });
    if (error) return res.status(400).json({ message: error });

    const existente = await Convocatoria.findOne({ where: { id_partido } });
    if (existente) return res.status(409).json({ message: 'Este partido ya tiene una convocatoria.' });

    const idsJugador = [...new Set((jugadores || []).map(Number).filter(Boolean))];
    const sinJugador = normalizarNoConvocados(no_convocados, idsJugador);
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
        sinJugador.map((s) => ({ id_convocatoria: convocatoria.id, id_plantilla, id_jugador: s.id_jugador, observaciones: s.observaciones })),
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

    const { jugadores, no_convocados } = req.body;
    if (jugadores === undefined && no_convocados === undefined) {
      const completa = await Convocatoria.findByPk(convocatoria.id, { include: includesBase });
      return res.json(serialize(completa));
    }

    const partido = await Partido.findByPk(convocatoria.id_partido);
    const idsJugador = [...new Set((jugadores || []).map(Number).filter(Boolean))];
    const sinJugador = normalizarNoConvocados(no_convocados, idsJugador);
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
        sinJugador.map((s) => ({ id_convocatoria: convocatoria.id, id_plantilla: convocatoria.id_plantilla, id_jugador: s.id_jugador, observaciones: s.observaciones })),
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

    const partido = await Partido.findByPk(convocatoria.id_partido);
    if (partido && new Date(partido.fecha).getTime() < Date.now()) {
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

module.exports = { listar, obtener, crear, actualizar, eliminar };
