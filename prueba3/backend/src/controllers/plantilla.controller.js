const { Plantilla, Categoria, Temporada, Division, Jugador, Entrenador, Delegado } = require('../models');

const includes = [
  { model: Categoria, as: 'categoria', attributes: ['id', 'nombre', 'alias', 'id_tipofutbol', 'tiempopartido'] },
  { model: Temporada, as: 'temporada', attributes: ['id', 'nombre'] },
  { model: Division, as: 'division', attributes: ['id', 'nombre'] },
  { model: Jugador, as: 'jugador', attributes: ['id', 'nombre', 'apellidos'] },
  { model: Entrenador, as: 'entrenador', attributes: ['id', 'nombre', 'apellidos'] },
  { model: Delegado, as: 'delegado', attributes: ['id', 'nombre', 'apellidos'] }
];

function serializePlantilla(plantilla) {
  return plantilla.toJSON ? plantilla.toJSON() : plantilla;
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
    res.json(plantillas.map(serializePlantilla));
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const plantilla = await Plantilla.findOne({ where: { id: req.params.id }, include: includes });
    if (!plantilla) return res.status(404).json({ message: 'Plantilla no encontrada.' });
    res.json(serializePlantilla(plantilla));
  } catch (err) { next(err); }
}

async function validarReferencias({ id_categoria, id_temporada, id_division, id_jugador, id_entrenador, id_delegado }) {
  const categoria = await Categoria.findOne({ where: { id: id_categoria } });
  if (!categoria) return 'La categoría indicada no existe.';
  const temporada = await Temporada.findOne({ where: { id: id_temporada } });
  if (!temporada) return 'La temporada indicada no existe.';
  if (id_division) {
    const existe = await Division.findOne({ where: { id: id_division } });
    if (!existe) return 'La división indicada no existe.';
  }
  if (id_jugador) {
    const existe = await Jugador.findOne({ where: { id: id_jugador } });
    if (!existe) return 'El jugador indicado no existe.';
  }
  if (id_entrenador) {
    const existe = await Entrenador.findOne({ where: { id: id_entrenador } });
    if (!existe) return 'El entrenador indicado no existe.';
  }
  if (id_delegado) {
    const existe = await Delegado.findOne({ where: { id: id_delegado } });
    if (!existe) return 'El delegado indicado no existe.';
  }
  return null;
}

/**
 * Una categoría solo puede registrarse una vez en la misma temporada y,
 * a su vez, solo puede tener una temporada (una fila por categoría).
 * `excludeId` permite ignorar la propia fila al actualizar.
 */
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

/** Evita duplicar a la misma persona dentro de la misma plantilla (categoría + temporada). */

async function crear(req, res, next) {
  try {
    const { id_categoria, id_temporada, id_division, id_jugador, id_entrenador, id_delegado } = req.body;
    if (!id_categoria || !id_temporada) {
      return res.status(400).json({ message: 'Categoría y temporada son obligatorias.' });
    }
    const errorRef = await validarReferencias({ id_categoria, id_temporada, id_division, id_jugador, id_entrenador, id_delegado });
    if (errorRef) return res.status(400).json({ message: errorRef });
    const errorCategoria = await validarCategoriaDisponible(id_categoria, id_temporada);
    if (errorCategoria) return res.status(409).json({ message: errorCategoria });

    const plantilla = await Plantilla.create({
      id_categoria,
      id_temporada,
      id_division: id_division || null,
      id_jugador: id_jugador || null,
      id_entrenador: id_entrenador || null,
      id_delegado: id_delegado || null
    });
    const completa = await Plantilla.findOne({ where: { id: plantilla.id }, include: includes });
    res.status(201).json(serializePlantilla(completa));
  } catch (err) { next(err); }
}

/**
 * Crea en bloque una plantilla por cada categoría existente para la
 * temporada indicada. Las categorías ya registradas se omiten.
 */
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
      id_division: null,
      id_jugador: null,
      id_entrenador: null,
      id_delegado: null
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
    const { id_categoria, id_temporada, id_division, id_jugador, id_entrenador, id_delegado } = req.body;

    const nuevos = {
      id_categoria: id_categoria !== undefined ? id_categoria : plantilla.id_categoria,
      id_temporada: id_temporada !== undefined ? id_temporada : plantilla.id_temporada,
      id_division: id_division !== undefined ? (id_division || null) : plantilla.id_division,
      id_jugador: id_jugador !== undefined ? (id_jugador || null) : plantilla.id_jugador,
      id_entrenador: id_entrenador !== undefined ? (id_entrenador || null) : plantilla.id_entrenador,
      id_delegado: id_delegado !== undefined ? (id_delegado || null) : plantilla.id_delegado
    };

    const errorRef = await validarReferencias(nuevos);
    if (errorRef) return res.status(400).json({ message: errorRef });
    const errorCategoria = await validarCategoriaDisponible(nuevos.id_categoria, nuevos.id_temporada, plantilla.id);
    if (errorCategoria) return res.status(409).json({ message: errorCategoria });

    Object.assign(plantilla, nuevos);
    await plantilla.save();
    const actualizada = await Plantilla.findOne({ where: { id: plantilla.id }, include: includes });
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
