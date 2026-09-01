const { Cambio, Usuario, Temporada, Lugar, Titulo, Division, Posicion, Delegado, Categoria, Jugador, Entrenador, Entrenamiento, Partido, Equipo, TipoFutbol, Patrocinador, Jornada, Sancion, Plantilla, Promocion } = require('../models');

const ENTITY_MAP = {
  usuarios: { model: Usuario, label: 'Usuarios' },
  temporadas: { model: Temporada, label: 'Temporadas' },
  lugares: { model: Lugar, label: 'Lugares' },
  titulos: { model: Titulo, label: 'Títulos' },
  divisiones: { model: Division, label: 'Divisiones' },
  posiciones: { model: Posicion, label: 'Posiciones' },
  delegados: { model: Delegado, label: 'Delegados' },
  categorias: { model: Categoria, label: 'Categorías' },
  jugadores: { model: Jugador, label: 'Jugadores' },
  entrenadores: { model: Entrenador, label: 'Entrenadores' },
  entrenamientos: { model: Entrenamiento, label: 'Entrenamientos' },
  partidos: { model: Partido, label: 'Partidos' },
  equipos: { model: Equipo, label: 'Equipos' },
  'tipos-futbol': { model: TipoFutbol, label: 'Tipos de fútbol' },
  patrocinadores: { model: Patrocinador, label: 'Patrocinadores' },
  jornadas: { model: Jornada, label: 'Jornadas' },
  sanciones: { model: Sancion, label: 'Sanciones' },
  plantillas: { model: Plantilla, label: 'Plantillas' },
  'entrenamientos-jugadores': { model: null, label: 'Entrenamientos-Jugadores' },
  promociones: { model: Promocion, label: 'Promociones' }
};

const SENSITIVE_KEYS = ['password', 'token', 'jwt', 'secret', 'AES_SECRET_KEY'];

function extractEntity(url) {
  const match = url.match(/\/api\/([\w-]+)/);
  return match ? match[1] : null;
}

function extractIdFromUrl(url) {
  const match = url.match(/\/api\/[\w-]+\/(\d+)/);
  return match ? Number(match[1]) : null;
}

function methodToAccion(method) {
  if (method === 'POST') return 'crear';
  if (method === 'PUT') return 'editar';
  if (method === 'DELETE') return 'eliminar';
  return null;
}

function sanitize(data) {
  if (!data || typeof data !== 'object') return data;
  const clean = Array.isArray(data) ? [...data] : { ...data };
  for (const key of SENSITIVE_KEYS) delete clean[key];
  return clean;
}

function auditMiddleware(req, res, next) {
  if (!['POST', 'PUT', 'DELETE'].includes(req.method)) return next();

  const entidad = extractEntity(req.originalUrl);
  const accion = methodToAccion(req.method);
  if (!entidad || !accion || entidad === 'auth') return next();

  const entityInfo = ENTITY_MAP[entidad];
  const urlId = extractIdFromUrl(req.originalUrl);

  const originalJson = res.json.bind(res);
  let responseBody = null;
  res.json = function (body) {
    responseBody = body;
    return originalJson(body);
  };

  function setupFinishListener() {
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        try {
          const idRegistro =
            accion === 'eliminar'
              ? urlId
              : (responseBody && responseBody.id ? responseBody.id : urlId);

          await Cambio.create({
            entidad,
            id_registro: idRegistro,
            accion,
            datos_previos: req._auditBefore || null,
            datos_nuevos: accion === 'eliminar' ? null : sanitize(responseBody || req.body),
            id_usuario: req.user.id
          });
        } catch (err) {
          console.error('[audit] Error guardando cambio:', err.message);
        }
      }
    });
  }

  if ((accion === 'editar' || accion === 'eliminar') && urlId && entityInfo?.model) {
    entityInfo.model.findByPk(urlId)
      .then((record) => {
        req._auditBefore = record ? sanitize(record.toJSON()) : null;
        setupFinishListener();
        next();
      })
      .catch((err) => {
        setupFinishListener();
        next();
      });
  } else {
    setupFinishListener();
    next();
  }
}

module.exports = auditMiddleware;
