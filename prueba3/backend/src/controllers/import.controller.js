/**
 * Importación masiva de filas (desde Excel) por recurso.
 * Solo se aceptan los campos de la lista blanca de cada recurso;
 * el campo `id` nunca se importa.
 */
const models = require('../models');

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

async function importar(req, res, next) {
  try {
    const cfg = RECURSOS[req.params.recurso];
    if (!cfg) return res.status(404).json({ message: 'Recurso no importable.' });
    const filas = Array.isArray(req.body.filas) ? req.body.filas : [];
    if (!filas.length) return res.status(400).json({ message: 'No hay filas que importar.' });

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

module.exports = { importar, RECURSOS };
