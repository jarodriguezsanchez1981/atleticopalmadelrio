const { Router } = require('express');
const { restringirACategoria, porPlantilla, plantillaSuya } = require('../middlewares/categoria.middleware');
const ctrl = require('../controllers/estadistica.controller');
const clasificacion = require('../controllers/clasificacion.controller');
const requireEditar = require('../middlewares/requireEditar');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

const router = Router();

router.use(authenticate);
// Un entrenador solo ve y toca lo de su categoría (middlewares/categoria.middleware.js).
router.use(restringirACategoria());

// Cada tabla de Estadísticas es una sección con su permiso: las de jugadores
// usan el listado por jugador; Estadísticas Equipo, el del equipo.
router.get('/', authorize('estadisticas_convocatorias', 'estadisticas_tiempo', 'estadisticas_goles', 'estadisticas_sanciones'), ctrl.listar);
router.get('/equipo', authorize('estadisticas_equipo'), ctrl.equipo);
// Clasificación de la liga por jornada; el POST guarda la siguiente jornada
// leyéndola de RFAF (un entrenador, solo en su plantilla).
router.get('/clasificacion', authorize('estadisticas_clasificacion'), clasificacion.listar);
router.post('/clasificacion', authorize('estadisticas_clasificacion'), requireEditar('estadisticas_clasificacion'),
  restringirACategoria({ cuerpo: (body, ctx) => plantillaSuya(body.id_plantilla, ctx) }), clasificacion.guardarSiguiente);
// Gráficas de balance por plantilla del Dashboard.
router.get('/balance', authorize('dashboard'), ctrl.balance);

module.exports = router;
