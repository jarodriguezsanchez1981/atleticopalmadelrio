const { Router } = require('express');
const { restringirACategoria, porPlantilla, plantillaSuya } = require('../middlewares/categoria.middleware');
const ctrl = require('../controllers/estadistica.controller');
const clasificacion = require('../controllers/clasificacion.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

const router = Router();

router.use(authenticate);
// Un entrenador solo ve y toca lo de su categoría (middlewares/categoria.middleware.js).
router.use(restringirACategoria());

// Cada tabla de Estadísticas es una sección con su permiso: las de jugadores
// usan el listado por jugador; Estadísticas Equipo, el del equipo. Las de
// categoría (estadisticas_cat_*) reutilizan el mismo listado por jugador.
const SECCIONES_LISTADO = [
  'estadisticas_convocatorias', 'estadisticas_tiempo', 'estadisticas_goles', 'estadisticas_sanciones',
  'estadisticas_cat_convocatorias', 'estadisticas_cat_goles'
];
router.get('/', authorize(...SECCIONES_LISTADO), ctrl.listar);
// Plantillas (con jugadores) para el selector de las Estadísticas por categoría.
router.get('/plantillas', authorize(...SECCIONES_LISTADO), ctrl.plantillasEstadisticas);
// Estadísticas Equipo; también lo lee Estadísticas Goles (la parte de goles).
router.get('/equipo', authorize('estadisticas_equipo', 'estadisticas_goles', 'estadisticas_cat_goles'), ctrl.equipo);
// Goles del equipo contrario por periodo (tabla aparte en Estadísticas Goles).
router.get('/goles-contra', authorize('estadisticas_goles', 'estadisticas_cat_goles'), ctrl.golesContra);
// Clasificación de la liga por jornada (se copia sola de RFAF: utils/clasificacionAutomatica.js).
router.get('/clasificacion', authorize('estadisticas_clasificacion', 'estadisticas_cat_clasificacion'), clasificacion.listar);
// Gráficas de balance por plantilla del Dashboard.
router.get('/balance', authorize('dashboard'), ctrl.balance);

module.exports = router;
