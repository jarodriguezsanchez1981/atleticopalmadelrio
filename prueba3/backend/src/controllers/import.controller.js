/**
 * Importación masiva de filas (desde Excel) por recurso.
 * Solo se aceptan los campos de la lista blanca de cada recurso;
 * el campo `id` nunca se importa.
 */
const models = require('../models');
const { Op } = require('sequelize');

const RECURSOS = {
  temporadas: { modelo: 'Temporada', campos: ['nombre'] },
  titulos: { modelo: 'Titulo', campos: ['nombre'] },
  divisiones: { modelo: 'Division', campos: ['nombre'] },
  'tipos-futbol': { modelo: 'TipoFutbol', campos: ['nombre'] },
  lugares: { modelo: 'Lugar', campos: ['nombre', 'escudo', 'direccion', 'codigopostal', 'localidad', 'provincia'] },
  delegados: { modelo: 'Delegado', campos: ['nombre', 'apellidos', 'dni', 'foto', 'tipo'] },
  categorias: { modelo: 'Categoria', campos: ['nombre', 'alias', 'id_tipofutbol', 'tiempopartido', 'tiempoentrenamiento'] },
  equipos: { modelo: 'Equipo', campos: ['nombre', 'escudo', 'direccion', 'codigopostal', 'localidad', 'provincia'] },
  incidencias: { modelo: 'Incidencia', campos: ['id_categoria', 'id_jugador', 'id_entrenador', 'id_delegado', 'id_usuario', 'incidencias', 'fecha'] },
  jugadores: { modelo: 'Jugador', campos: ['nombre', 'apellidos', 'dni', 'fecha_nacimiento', 'foto'] },
  entrenadores: { modelo: 'Entrenador', campos: ['nombre', 'apellidos', 'dni', 'foto'] },
  patrocinadores: { modelo: 'Patrocinador', campos: ['nombre', 'imagen', 'tipo'] },
  jornadas: { modelo: 'Jornada', campos: ['id_plantilla', 'id_equipo_local', 'id_equipo_visitante', 'jornada', 'fecha', 'hora'] },
  sanciones: { modelo: 'Sancion', campos: ['id_partido', 'id_jugador'] },
  plantillas: { modelo: 'Plantilla', campos: ['id_categoria', 'id_temporada', 'id_division', 'id_jugador', 'id_entrenador', 'id_delegado'] }
};

/** Mapeo de columnas legibles a campos de BD para jornadas */
const JORNADAS_COLUMN_MAP = {
  'Plantilla': 'id_plantilla',
  'Local': 'id_equipo_local',
  'Visitante': 'id_equipo_visitante',
  'Jornada': 'jornada',
  'Fecha': 'fecha',
  'Hora': 'hora'
};

/**
 * Busca una plantilla por su nombre (formato "Categoria / Temporada")
 */
async function buscarPlantillaPorNombre(nombre) {
  if (!nombre) return null;
  // Formato esperado: "Benjamin A / 2026/2027"
  const partes = nombre.split(' / ');
  if (partes.length !== 2) return null;
  const [categoriaNombre, temporadaNombre] = partes;
  
  const Plantilla = models.Plantilla;
  const Categoria = models.Categoria;
  const Temporada = models.Temporada;
  
  const categoria = await Categoria.findOne({ where: { nombre: { [Op.like]: categoriaNombre.trim() } } });
  if (!categoria) return null;
  
  const temporada = await Temporada.findOne({ where: { nombre: { [Op.like]: temporadaNombre.trim() } } });
  if (!temporada) return null;
  
  const plantilla = await Plantilla.findOne({
    where: { id_categoria: categoria.id, id_temporada: temporada.id }
  });
  return plantilla?.id || null;
}

/**
 * Busca un equipo por su nombre; si no existe lo crea
 */
async function buscarEquipoPorNombre(nombre) {
  if (!nombre) return null;
  const Equipo = models.Equipo;
  const nombreLimpio = nombre.trim();
  let equipo = await Equipo.findOne({ where: { nombre: { [Op.like]: nombreLimpio } } });
  if (!equipo) {
    // Crear equipo nuevo con datos mínimos
    equipo = await Equipo.create({ nombre: nombreLimpio });
  }
  return equipo?.id || null;
}

/**
 * Convierte fecha de DD/MM/YYYY o DD-MM-YYYY a YYYY-MM-DD
 */
function convertirFecha(fechaStr) {
  if (!fechaStr) return null;
  const str = String(fechaStr).trim();
  // Intentar DD/MM/YYYY
  let match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }
  // Intentar YYYY-MM-DD
  match = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  }
  return str; // Devolver como está si no coincide
}

/**
 * Convierte hora de HH:MM a HH:MM:SS
 */
function convertirHora(horaStr) {
  if (!horaStr) return null;
  const str = String(horaStr).trim();
  // HH:MM
  if (/^\d{1,2}:\d{2}$/.test(str)) {
    return str + ':00';
  }
  // HH:MM:SS
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(str)) {
    return str;
  }
  // Solo horas (0, 1, 2, etc.)
  if (/^\d+$/.test(str)) {
    return str.padStart(2, '0') + ':00:00';
  }
  return str;
}

async function importar(req, res, next) {
  try {
    const cfg = RECURSOS[req.params.recurso];
    if (!cfg) return res.status(404).json({ message: 'Recurso no importable.' });
    const filas = Array.isArray(req.body.filas) ? req.body.filas : [];
    if (!filas.length) return res.status(400).json({ message: 'No hay filas que importar.' });

    // Manejo especial para jornadas
    if (req.params.recurso === 'jornadas') {
      return await importarJornadas(filas, res);
    }

    const Modelo = models[cfg.modelo];
    let insertados = 0;
    const errores = [];
    for (let i = 0; i < filas.length; i++) {
      const limpia = Object.fromEntries(
        Object.entries(filas[i]).filter(([k]) => cfg.campos.includes(k) && k !== 'id')
      );
      if (!Object.keys(limpia).length) {
        errores.push({ fila: i + 2, mensaje: 'Sin datos válidos.' });
        continue;
      }
      try {
        await Modelo.create(limpia);
        insertados++;
      } catch (err) {
        errores.push({ fila: i + 2, mensaje: err.message });
      }
    }
    res.json({ insertados, errores });
  } catch (err) { next(err); }
}

/**
 * Importación especial para jornadas: resuelve nombres a IDs
 * También crea los partidos correspondientes (local y visitante) automáticamente
 */
async function importarJornadas(filas, res) {
  let insertados = 0;
  const errores = [];
  
  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    const filaNum = i + 2; // +1 por header, +1 base 1
    
    try {
      // Mapear columnas legibles a campos BD
      const datos = {};
      for (const [columna, valor] of Object.entries(fila)) {
        const campo = JORNADAS_COLUMN_MAP[columna];
        if (!campo) continue;
        
        if (campo === 'id_plantilla') {
          datos[campo] = await buscarPlantillaPorNombre(valor);
          if (!datos[campo]) {
            throw new Error(`Plantilla no encontrada: "${valor}"`);
          }
        } else if (campo === 'id_equipo_local' || campo === 'id_equipo_visitante') {
          datos[campo] = await buscarEquipoPorNombre(valor);
          if (!datos[campo]) {
            throw new Error(`Equipo no encontrado: "${valor}"`);
          }
        } else if (campo === 'fecha') {
          datos[campo] = convertirFecha(valor);
        } else if (campo === 'hora') {
          datos[campo] = convertirHora(valor);
        } else {
          datos[campo] = valor;
        }
      }
      
      if (!Object.keys(datos).length) {
        errores.push({ fila: filaNum, mensaje: 'Sin datos válidos.' });
        continue;
      }
      
      // Verificar campos obligatorios
      const obligatorios = ['id_plantilla', 'id_equipo_local', 'id_equipo_visitante', 'jornada', 'fecha'];
      const faltantes = obligatorios.filter(c => !datos[c]);
      if (faltantes.length) {
        errores.push({ fila: filaNum, mensaje: `Faltan campos obligatorios: ${faltantes.join(', ')}` });
        continue;
      }
      
      // Crear jornada
      const jornadaCreada = await models.Jornada.create(datos);
      
      // AUTOMÁTICO: Crear partidos correspondientes (local y visitante)
      const plantilla = await models.Plantilla.findByPk(datos.id_plantilla);
      const idUsuario = 1; // Usuario admin por defecto para importaciones
      
      // Partido local
      await models.Partido.create({
        id_plantilla: datos.id_plantilla,
        fecha: datos.fecha,
        id_lugar: null,
        id_equipo: datos.id_equipo_local,
        es_local: true,
        id_usuario: 1,
        incidencias: null
      });
      
      // Partido visitante
      await models.Partido.create({
        id_plantilla: datos.id_plantilla,
        fecha: datos.fecha,
        id_lugar: null,
        id_equipo: datos.id_equipo_visitante,
        es_local: false,
        id_usuario: 1,
        incidencias: null
      });
      
      insertados++;
    } catch (err) {
      errores.push({ fila: filaNum, mensaje: err.message });
    }
  }
  
  res.json({ insertados, errores });
}

module.exports = { importar, RECURSOS };