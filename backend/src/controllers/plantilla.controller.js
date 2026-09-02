const { Plantilla, Categoria, Temporada, Division, Jugador, Entrenador, Delegado, PlantillaJugador, PlantillaEntrenador, PlantillaDelegado, Titulo, Promocion, Posicion } = require('../models');

const includes = [
  { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'alias', 'id_tipofutbol', 'tiempopartido'] },
  { model: Temporada, as: 'temporada', attributes: ['id', 'nombre'] },
  { model: Division, as: 'division', attributes: ['id', 'nombre'] },
  { model: Jugador, as: 'jugadores', attributes: ['id', 'nombre', 'apellidos', 'foto'], through: { attributes: ['id', 'dorsal', 'talla', 'titular', 'promocion'] } },
  { model: Entrenador, as: 'entrenadores', attributes: ['id', 'nombre', 'apellidos', 'foto'], through: { attributes: ['rol'] }, include: [{ model: Titulo, as: 'titulos', attributes: ['id', 'nombre'], through: { attributes: [] } }] },
  { model: Delegado, as: 'delegados', attributes: ['id', 'nombre', 'apellidos', 'foto', 'tipo'], through: { attributes: ['rol'] } }
];

function serializePlantilla(plantilla) {
  const json = plantilla.toJSON ? plantilla.toJSON() : plantilla;
  // Normalizar: si viene solo jugador/entrenador/delegado (legacy), convertir a array
  if (json.jugador && !json.jugadores) json.jugadores = [json.jugador];
  if (json.entrenador && !json.entrenadores) json.entrenadores = [json.entrenador];
  if (json.delegado && !json.delegados) json.delegados = [json.delegado];
  return json;
}

/** Adjunta a cada jugador sus posiciones (por membresía de plantilla). */
async function adjuntarPosiciones(plantillas) {
  const lista = Array.isArray(plantillas) ? plantillas : [plantillas];
  const ids = lista.filter((p) => p?.id).map((p) => p.id);
  if (!ids.length) return plantillas;

  const miembros = (await PlantillaJugador.findAll({
    where: { id_plantilla: ids },
    include: [{ model: Posicion, as: 'posiciones', attributes: ['id', 'nombre', 'alias'], through: { attributes: [] } }]
  })) || [];
  const porPlantilla = new Map();
  miembros.forEach((m) => {
    if (!porPlantilla.has(m.id_plantilla)) porPlantilla.set(m.id_plantilla, new Map());
    porPlantilla.get(m.id_plantilla).set(m.id_jugador, m.posiciones || []);
  });

  lista.forEach((p) => {
    const mapa = porPlantilla.get(p.id);
    (p.jugadores || []).forEach((j) => {
      if (j.PlantillaJugador && typeof j.PlantillaJugador.setDataValue === 'function') {
        j.PlantillaJugador.setDataValue('posiciones', mapa?.get(j.id) || []);
      } else if (j.PlantillaJugador) {
        j.PlantillaJugador.posiciones = mapa?.get(j.id) || [];
      }
    });
  });
  return plantillas;
}

async function listar(req, res, next) {
  try {
    const { id_categoria, id_temporada } = req.query;
    const where = {};
    if (id_categoria) where.id_categoria = id_categoria;
    if (id_temporada) where.id_temporada = id_temporada;
    const plantillas = await Plantilla.findAll({
      where: Object.keys(where).length ? where : undefined,
      include: includes,
      order: [
        [{ model: Categoria, as: 'categoria' }, 'nombre', 'ASC'],
        [{ model: Temporada, as: 'temporada' }, 'nombre', 'DESC']
      ]
    });
    await adjuntarPosiciones(plantillas);
    res.json(plantillas.map(serializePlantilla));
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const plantilla = await Plantilla.findOne({ where: { id: req.params.id }, include: includes });
    if (!plantilla) return res.status(404).json({ message: 'Plantilla no encontrada.' });
    await adjuntarPosiciones(plantilla);
    res.json(serializePlantilla(plantilla));
  } catch (err) { next(err); }
}

async function validarReferencias({ id_categoria, id_temporada, id_division, jugadores, ids_entrenadores, ids_delegados }) {
  const categoria = await Categoria.findOne({ where: { id: id_categoria } });
  if (!categoria) return 'La categoría indicada no existe.';
  const temporada = await Temporada.findOne({ where: { id: id_temporada } });
  if (!temporada) return 'La temporada indicada no existe.';
  if (id_division) {
    const existe = await Division.findOne({ where: { id: id_division } });
    if (!existe) return 'La división indicada no existe.';
  }
  if (jugadores && jugadores.length) {
    const ids = jugadores.map(j => j.id_jugador).filter(Boolean);
    const count = await Jugador.count({ where: { id: ids } });
    if (count !== ids.length) return 'Algún jugador indicado no existe.';
  }
  if (ids_entrenadores && ids_entrenadores.length) {
    const count = await Entrenador.count({ where: { id: ids_entrenadores } });
    if (count !== ids_entrenadores.length) return 'Algún entrenador indicado no existe.';
  }
  if (ids_delegados && ids_delegados.length) {
    const count = await Delegado.count({ where: { id: ids_delegados } });
    if (count !== ids_delegados.length) return 'Algún delegado indicado no existe.';
  }
  return null;
}

async function validarCategoriaDisponible(idCategoria, idTemporada, excludeId = null) {
  const where = { id_categoria: idCategoria };
  if (excludeId) where.id = { ne: excludeId };
  const existente = await Plantilla.findOne({ where });
  if (!existente) return null;
  const categoria = await Categoria.findOne({ where: { id: idCategoria }, attributes: ['nombre'] });
  if (Number(existente.id_temporada) === Number(idTemporada)) {
    return `La categoría ${categoria?.nombre || idCategoria} ya está registrada en esa temporada.`;
  }
  const temporada = await Temporada.findOne({ where: { id: existente.id_temporada }, attributes: ['nombre'] });
  return `La categoría ${categoria?.nombre || idCategoria} ya tiene plantilla en la temporada ${temporada?.nombre || existente.id_temporada}.`;
}

async function guardarPosicionesJugadores(idPlantilla, jugadores) {
  for (const j of jugadores || []) {
    if (!j?.id_jugador || !Array.isArray(j.ids_posiciones)) continue;
    const miembro = await PlantillaJugador.findOne({ where: { id_plantilla: idPlantilla, id_jugador: j.id_jugador } });
    if (miembro) await miembro.setPosiciones(j.ids_posiciones);
  }
}

async function sincronizarPromociones(plantilla, jugadores) {
  const marcados = (jugadores || []).filter((j) => j.promocion);
  await Promocion.destroy({ where: { id_plantilla: plantilla.id } });
  if (!marcados.length) return;
  const categoria = await Categoria.findOne({ where: { id: plantilla.id_categoria } });
  if (!categoria || categoria.orden == null) return;
  const siguiente = await Categoria.findOne({ where: { orden: Number(categoria.orden) + 1 } });
  if (!siguiente) return;
  const rows = marcados.map((j) => ({
    id_plantilla: plantilla.id,
    id_categoria: siguiente.id,
    id_jugador: j.id_jugador
  }));
  await Promocion.bulkCreate(rows, { ignoreDuplicates: true });
}

async function crear(req, res, next) {
  try {
    const { id_categoria, id_temporada, id_division, jugadores, ids_entrenadores, ids_delegados } = req.body;
    if (!id_categoria || !id_temporada) {
      return res.status(400).json({ message: 'Categoría y temporada son obligatorias.' });
    }
    const errorRef = await validarReferencias({ id_categoria, id_temporada, id_division, jugadores, ids_entrenadores, ids_delegados });
    if (errorRef) return res.status(400).json({ message: errorRef });
    const errorCategoria = await validarCategoriaDisponible(id_categoria, id_temporada);
    if (errorCategoria) return res.status(409).json({ message: errorCategoria });

    const plantilla = await Plantilla.create({
      id_categoria,
      id_temporada,
      id_division: id_division || null
    });

    // Asociar jugadores con dorsal y talla
    if (jugadores && jugadores.length) {
      const rows = jugadores.map(j => ({
        id_plantilla: plantilla.id,
        id_jugador: j.id_jugador,
        dorsal: j.dorsal || null,
        talla: j.talla || null,
        titular: j.titular || false,
        promocion: j.promocion || false
      }));
      await PlantillaJugador.bulkCreate(rows, { ignoreDuplicates: true });
      await guardarPosicionesJugadores(plantilla.id, jugadores);
    }

    // Asociar entrenadores
    if (ids_entrenadores && ids_entrenadores.length) {
      const rows = ids_entrenadores.map(id_entrenador => ({
        id_plantilla: plantilla.id,
        id_entrenador
      }));
      await PlantillaEntrenador.bulkCreate(rows, { ignoreDuplicates: true });
    }

    // Asociar delegados
    if (ids_delegados && ids_delegados.length) {
      const rows = ids_delegados.map(id_delegado => ({
        id_plantilla: plantilla.id,
        id_delegado
      }));
      await PlantillaDelegado.bulkCreate(rows, { ignoreDuplicates: true });
    }

    await sincronizarPromociones(plantilla, jugadores);

    const completa = await Plantilla.findOne({ where: { id: plantilla.id }, include: includes });
    await adjuntarPosiciones(completa);
    res.status(201).json(serializePlantilla(completa));
  } catch (err) { next(err); }
}

async function crearParaTemporada(req, res, next) {
  try {
    const { id_temporada } = req.body;
    if (!id_temporada) return res.status(400).json({ message: 'La temporada es obligatoria.' });
    const temporada = await Temporada.findOne({ where: { id: id_temporada } });
    if (!temporada) return res.status(400).json({ message: 'La temporada indicada no existe.' });
    const [categorias, existentes] = await Promise.all([
      Categoria.findAll(),
      Plantilla.findAll()
    ]);
    const ocupadas = new Set(existentes.map((p) => p.id_categoria));
    const libres = categorias.filter((c) => !ocupadas.has(c.id));
    await Plantilla.bulkCreate(libres.map((c) => ({
      id_categoria: c.id,
      id_temporada,
      id_division: null
    })));
    res.status(201).json({
      message: `Plantillas creadas para ${libres.length} categorías en la temporada ${temporada.nombre}.`,
      creadas: libres.length,
      omitidas: categorias.length - libres.length
    });
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const plantilla = await Plantilla.findOne({ where: { id: req.params.id } });
    if (!plantilla) return res.status(404).json({ message: 'Plantilla no encontrada.' });
    const { id_categoria, id_temporada, id_division, jugadores, ids_entrenadores, ids_delegados } = req.body;

    const nuevos = {
      id_categoria: id_categoria !== undefined ? id_categoria : plantilla.id_categoria,
      id_temporada: id_temporada !== undefined ? id_temporada : plantilla.id_temporada,
      id_division: id_division !== undefined ? (id_division || null) : plantilla.id_division
    };

    const errorRef = await validarReferencias({ ...nuevos, jugadores, ids_entrenadores, ids_delegados });
    if (errorRef) return res.status(400).json({ message: errorRef });
    const errorCategoria = await validarCategoriaDisponible(nuevos.id_categoria, nuevos.id_temporada, plantilla.id);
    if (errorCategoria) return res.status(409).json({ message: errorCategoria });

    Object.assign(plantilla, nuevos);
    await plantilla.save();

    // Actualizar jugadores si se envían
    if (jugadores !== undefined) {
      await PlantillaJugador.destroy({ where: { id_plantilla: plantilla.id } });
      if (jugadores && jugadores.length) {
        const rows = jugadores.map(j => ({
          id_plantilla: plantilla.id,
          id_jugador: j.id_jugador,
          dorsal: j.dorsal || null,
          talla: j.talla || null,
          titular: j.titular || false,
          promocion: j.promocion || false
        }));
        await PlantillaJugador.bulkCreate(rows, { ignoreDuplicates: true });
        await guardarPosicionesJugadores(plantilla.id, jugadores);
      }
    }

    // Actualizar entrenadores si se envían
    if (ids_entrenadores !== undefined) {
      await PlantillaEntrenador.destroy({ where: { id_plantilla: plantilla.id } });
      if (ids_entrenadores.length) {
        const rows = ids_entrenadores.map(id_entrenador => ({
          id_plantilla: plantilla.id,
          id_entrenador
        }));
        await PlantillaEntrenador.bulkCreate(rows, { ignoreDuplicates: true });
      }
    }

    // Actualizar delegados si se envían
    if (ids_delegados !== undefined) {
      await PlantillaDelegado.destroy({ where: { id_plantilla: plantilla.id } });
      if (ids_delegados.length) {
        const rows = ids_delegados.map(id_delegado => ({
          id_plantilla: plantilla.id,
          id_delegado
        }));
        await PlantillaDelegado.bulkCreate(rows, { ignoreDuplicates: true });
      }
    }

    if (jugadores !== undefined) {
      await sincronizarPromociones(plantilla, jugadores);
    }

    const actualizada = await Plantilla.findOne({ where: { id: plantilla.id }, include: includes });
    await adjuntarPosiciones(actualizada);
    res.json(serializePlantilla(actualizada));
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Plantilla.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Plantilla no encontrada.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, crearParaTemporada, actualizar, eliminar };