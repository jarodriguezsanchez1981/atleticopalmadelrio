const {
  TorneoGenerado, TorneoGeneradoCategoria, TorneoGeneradoEquipo, Categoria, sequelize
} = require('../models');
const { opcionesDetalleTorneo } = require('../utils/torneoGeneradoDetalle');

// Sección "Generar Torneo": torneos de Fútbol 7 del club. Cada categoría es un
// torneo independiente; los partidos no se guardan, los calcula el frontend
// (utils/generarTorneo.js) a partir de lo que se guarda aquí.

const CAMPOS_VALIDOS = ['anexo1', 'anexo2', 'estadio1', 'estadio2'];
const FUTBOL_7 = 1;


const texto = (v) => (v == null ? '' : String(v).trim());
// Hora en formato HH:MM (MySQL la devuelve con segundos, también se aceptan).
const esHora = (v) => /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(texto(v));

/** Comprueba el cuerpo de crear/editar. Devuelve el mensaje de error o null. */
function validarTorneo(body) {
  const { nombre, fecha, categorias } = body || {};
  if (!texto(nombre)) return 'El nombre del torneo es obligatorio.';
  if (!texto(fecha)) return 'La fecha del torneo es obligatoria.';
  if (!Array.isArray(categorias) || !categorias.length) return 'Elige al menos una categoría.';

  const vistas = new Set();
  for (const cat of categorias) {
    const id = Number(cat.id_categoria);
    if (!id) return 'Hay una categoría sin elegir.';
    if (vistas.has(id)) return 'Una categoría no puede repetirse en el mismo torneo.';
    vistas.add(id);

    if (!texto(cat.hora_inicio)) return 'Cada categoría necesita una hora de comienzo.';
    if (!esHora(cat.hora_inicio)) return 'La hora de comienzo debe tener el formato HH:MM.';
    if (texto(cat.hora_fin) && !esHora(cat.hora_fin)) return 'La hora de final debe tener el formato HH:MM.';
    if (!(Number(cat.duracion_min) > 0)) return 'La duración de los partidos debe ser mayor que 0.';
    if (Number(cat.descanso_min || 0) < 0) return 'El descanso no puede ser negativo.';
    if (!Array.isArray(cat.campos) || !cat.campos.length) return 'Cada categoría necesita al menos un campo.';
    if (cat.campos.some((c) => !CAMPOS_VALIDOS.includes(c))) return 'Hay un campo que no existe.';
    if (!['liga', 'grupos'].includes(cat.formato)) return 'El formato debe ser todos contra todos o por grupos.';

    const lista = Array.isArray(cat.equipos) ? cat.equipos : [];
    if (lista.some((e) => !Number(e.id_equipo) || !texto(e.nombre))) return 'Cada equipo necesita equipo y nombre.';
    const nombres = new Set();
    for (const e of lista) {
      const clave = texto(e.nombre).toLowerCase();
      if (nombres.has(clave)) return `El nombre «${texto(e.nombre)}» está repetido en la misma categoría.`;
      nombres.add(clave);
    }

    if (cat.formato === 'liga') {
      if (lista.length < 2) return 'En todos contra todos hacen falta al menos 2 equipos.';
      if (cat.final_plata && lista.length < 4) return 'La Final de Plata (3º contra 4º) necesita al menos 4 equipos.';
    } else {
      if (lista.some((e) => !['A', 'B'].includes(e.grupo))) return 'Todos los equipos tienen que estar en el Grupo A o en el B.';
      const enA = lista.filter((e) => e.grupo === 'A').length;
      const enB = lista.filter((e) => e.grupo === 'B').length;
      if (enA < 2 || enB < 2) return 'Cada grupo necesita al menos 2 equipos.';
    }
  }
  return null;
}

/** Solo categorías existentes y de Fútbol 7. Devuelve el mensaje de error o null. */
async function comprobarCategorias(categorias) {
  const ids = categorias.map((c) => Number(c.id_categoria));
  const encontradas = await Categoria.findAll({ where: { id: ids }, attributes: ['id', 'id_tipofutbol'] });
  if (encontradas.length !== ids.length) return 'Hay una categoría que no existe.';
  if (encontradas.some((c) => Number(c.id_tipofutbol) !== FUTBOL_7)) return 'Solo se pueden elegir categorías de Fútbol 7.';
  return null;
}

async function guardarCategorias(idTorneo, categorias, transaction) {
  for (const cat of categorias) {
    const liga = cat.formato === 'liga';
    const fila = await TorneoGeneradoCategoria.create({
      id_torneo_generado: idTorneo,
      id_categoria: Number(cat.id_categoria),
      hora_inicio: texto(cat.hora_inicio),
      hora_fin: texto(cat.hora_fin) || null,
      duracion_min: Number(cat.duracion_min),
      descanso_min: Number(cat.descanso_min || 0),
      campos: CAMPOS_VALIDOS.filter((c) => cat.campos.includes(c)),
      formato: cat.formato,
      semifinales: !liga && !!cat.semifinales,
      final_oro: !!cat.final_oro,
      final_plata: !!cat.final_plata,
      sin_descanso: !!cat.sin_descanso
    }, { transaction });
    const equipos = (cat.equipos || []).map((e, i) => ({
      id_torneo_generado_categoria: fila.id,
      id_equipo: Number(e.id_equipo),
      nombre: texto(e.nombre),
      grupo: liga ? null : e.grupo,
      orden: i
    }));
    if (equipos.length) await TorneoGeneradoEquipo.bulkCreate(equipos, { transaction });
  }
}

const datosTorneo = (body) => ({
  nombre: texto(body.nombre),
  fecha: texto(body.fecha),
  observaciones: texto(body.observaciones) || null
});

async function listar(req, res, next) {
  try {
    const torneos = await TorneoGenerado.findAll({
      include: [{
        model: TorneoGeneradoCategoria,
        as: 'categorias',
        attributes: ['id', 'id_categoria'],
        include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] }]
      }],
      order: [['fecha', 'DESC'], ['id', 'DESC']]
    });
    res.json(torneos);
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const torneo = await TorneoGenerado.findByPk(req.params.id, opcionesDetalleTorneo({ conEscudos: true }));
    if (!torneo) return res.status(404).json({ message: 'Torneo no encontrado.' });
    res.json(torneo);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const error = validarTorneo(req.body) || await comprobarCategorias(req.body.categorias);
    if (error) return res.status(400).json({ message: error });
    const torneo = await sequelize.transaction(async (transaction) => {
      const nuevo = await TorneoGenerado.create(datosTorneo(req.body), { transaction });
      await guardarCategorias(nuevo.id, req.body.categorias, transaction);
      return nuevo;
    });
    // Se responde con el detalle completo: la auditoría guarda esta respuesta.
    res.status(201).json(await TorneoGenerado.findByPk(torneo.id, opcionesDetalleTorneo()));
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const torneo = await TorneoGenerado.findByPk(req.params.id);
    if (!torneo) return res.status(404).json({ message: 'Torneo no encontrado.' });
    const error = validarTorneo(req.body) || await comprobarCategorias(req.body.categorias);
    if (error) return res.status(400).json({ message: error });
    await sequelize.transaction(async (transaction) => {
      await torneo.update(datosTorneo(req.body), { transaction });
      // Se reemplazan categorías e inscripciones (las inscripciones caen por CASCADE).
      await TorneoGeneradoCategoria.destroy({ where: { id_torneo_generado: torneo.id }, transaction });
      await guardarCategorias(torneo.id, req.body.categorias, transaction);
    });
    res.json(await TorneoGenerado.findByPk(torneo.id, opcionesDetalleTorneo()));
  } catch (err) { next(err); }
}

async function eliminar(req, res, next) {
  try {
    const torneo = await TorneoGenerado.findByPk(req.params.id);
    if (!torneo) return res.status(404).json({ message: 'Torneo no encontrado.' });
    await torneo.destroy();
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { validarTorneo, listar, obtener, crear, actualizar, eliminar };
