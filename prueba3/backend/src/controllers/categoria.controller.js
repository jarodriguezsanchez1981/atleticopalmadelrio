const { Categoria, Entrenador, Delegado, Temporada, Division, TipoFutbol } = require('../models');

const includeEntrenadores = {
  model: Entrenador,
  as: 'entrenadores',
  attributes: ['id', 'nombre', 'apellidos', 'dni'],
  through: { attributes: [] }
};

const includes = [
  {
    model: TipoFutbol,
    as: 'tipofutbol',
    attributes: ['id', 'nombre']
  },
  {
    model: Temporada,
    as: 'temporada',
    attributes: ['id', 'nombre']
  },
  {
    model: Division,
    as: 'division',
    attributes: ['id', 'nombre']
  },
  includeEntrenadores,
  {
    model: Delegado,
    as: 'delegado',
    attributes: ['id', 'nombre', 'apellidos', 'dni'],
    required: false
  }
];

function normalizeEntrenadoresIds(body) {
  if (Array.isArray(body.ids_entrenadores)) return body.ids_entrenadores.map(Number).filter(Boolean);
  if (Array.isArray(body.entrenadores)) {
    return body.entrenadores.map((e) => (typeof e === 'object' ? Number(e.id) : Number(e))).filter(Boolean);
  }
  return null;
}

function serializeCategoria(categoria) {
  const json = categoria.toJSON ? categoria.toJSON() : categoria;
  json.ids_entrenadores = (json.entrenadores || []).map((e) => e.id);
  return json;
}

async function listar(req, res, next) {
  try {
    const { id_temporada } = req.query;
    const where = id_temporada ? { id_temporada } : undefined;
    const categorias = await Categoria.findAll({
      where,
      include: includes,
      order: [[{ model: Temporada, as: 'temporada' }, 'nombre', 'DESC'], ['nombre', 'ASC']]
    });
    res.json(categorias.map(serializeCategoria));
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const categoria = await Categoria.findOne({ where: { id: req.params.id }, include: includes });
    if (!categoria) return res.status(404).json({ message: 'Categoría no encontrada.' });
    res.json(serializeCategoria(categoria));
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nombre, alias, id_tipofutbol, id_temporada, id_division, id_delegado, tiempopartido, tiempoentrenamiento } = req.body;
    const idsEntrenadores = normalizeEntrenadoresIds(req.body) || [];
    if (!nombre || !id_temporada || !id_tipofutbol) {
      return res.status(400).json({ message: 'Nombre, temporada y tipo de fútbol son obligatorios.' });
    }
    const tipoFutbol = await TipoFutbol.findOne({ where: { id: id_tipofutbol } });
    if (!tipoFutbol) return res.status(400).json({ message: 'El tipo de fútbol indicado no existe.' });
    const temporada = await Temporada.findOne({ where: { id: id_temporada } });
    if (!temporada) return res.status(400).json({ message: 'La temporada indicada no existe.' });
    if (id_division) {
      const existe = await Division.findOne({ where: { id: id_division } });
      if (!existe) return res.status(400).json({ message: 'La división indicada no existe.' });
    }
    if (idsEntrenadores.length) {
      const contados = await Entrenador.count({ where: { id: idsEntrenadores } });
      if (contados !== idsEntrenadores.length) {
        return res.status(400).json({ message: 'Algún entrenador indicado no existe.' });
      }
    }
    if (id_delegado) {
      const existe = await Delegado.findOne({ where: { id: id_delegado } });
      if (!existe) return res.status(400).json({ message: 'El delegado indicado no existe.' });
    }
    if (tiempopartido !== undefined && tiempopartido !== null && (!Number.isInteger(tiempopartido) || tiempopartido <= 0)) {
      return res.status(400).json({ message: 'El tiempo de partido debe ser un número de minutos positivo.' });
    }
    if (tiempoentrenamiento !== undefined && tiempoentrenamiento !== null && (!Number.isInteger(tiempoentrenamiento) || tiempoentrenamiento <= 0)) {
      return res.status(400).json({ message: 'El tiempo de entrenamiento debe ser un número de minutos positivo.' });
    }
    const categoria = await Categoria.create({
      nombre,
      alias: alias || null,
      id_tipofutbol,
      id_temporada,
      id_division: id_division || null,
      id_delegado: id_delegado || null,
      tiempopartido: tiempopartido || null,
      tiempoentrenamiento: tiempoentrenamiento || null
    });
    if (idsEntrenadores.length) await categoria.setEntrenadores(idsEntrenadores);
    const creada = await Categoria.findOne({ where: { id: categoria.id }, include: includes });
    res.status(201).json(serializeCategoria(creada));
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const categoria = await Categoria.findOne({ where: { id: req.params.id } });
    if (!categoria) return res.status(404).json({ message: 'Categoría no encontrada.' });
    const { nombre, alias, id_tipofutbol, id_temporada, id_division, id_delegado, tiempopartido, tiempoentrenamiento } = req.body;
    const idsEntrenadores = normalizeEntrenadoresIds(req.body);
    if (nombre !== undefined) categoria.nombre = nombre;
    if (alias !== undefined) categoria.alias = alias || null;
    if (id_tipofutbol !== undefined) {
      const tipoFutbol = await TipoFutbol.findOne({ where: { id: id_tipofutbol } });
      if (!tipoFutbol) return res.status(400).json({ message: 'El tipo de fútbol indicado no existe.' });
      categoria.id_tipofutbol = id_tipofutbol;
    }
    if (id_division !== undefined) {
      if (id_division) {
        const existe = await Division.findOne({ where: { id: id_division } });
        if (!existe) return res.status(400).json({ message: 'La división indicada no existe.' });
      }
      categoria.id_division = id_division || null;
    }
    if (id_temporada !== undefined) {
      const temporada = await Temporada.findOne({ where: { id: id_temporada } });
      if (!temporada) return res.status(400).json({ message: 'La temporada indicada no existe.' });
      categoria.id_temporada = id_temporada;
    }
    if (idsEntrenadores) {
      const contados = await Entrenador.count({ where: { id: idsEntrenadores } });
      if (contados !== idsEntrenadores.length) {
        return res.status(400).json({ message: 'Algún entrenador indicado no existe.' });
      }
    }
    if (id_delegado !== undefined) {
      if (id_delegado) {
        const existe = await Delegado.findOne({ where: { id: id_delegado } });
        if (!existe) return res.status(400).json({ message: 'El delegado indicado no existe.' });
      }
      categoria.id_delegado = id_delegado || null;
    }
    if (tiempopartido !== undefined) {
      if (tiempopartido !== null && (!Number.isInteger(tiempopartido) || tiempopartido <= 0)) {
        return res.status(400).json({ message: 'El tiempo de partido debe ser un número de minutos positivo.' });
      }
      categoria.tiempopartido = tiempopartido || null;
    }
    if (tiempoentrenamiento !== undefined) {
      if (tiempoentrenamiento !== null && (!Number.isInteger(tiempoentrenamiento) || tiempoentrenamiento <= 0)) {
        return res.status(400).json({ message: 'El tiempo de entrenamiento debe ser un número de minutos positivo.' });
      }
      categoria.tiempoentrenamiento = tiempoentrenamiento || null;
    }
    await categoria.save();
    if (idsEntrenadores) await categoria.setEntrenadores(idsEntrenadores);
    const actualizada = await Categoria.findOne({ where: { id: categoria.id }, include: includes });
    res.json(serializeCategoria(actualizada));
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const eliminado = await Categoria.destroy({ where: { id: req.params.id } });
    if (!eliminado) return res.status(404).json({ message: 'Categoría no encontrada.' });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
