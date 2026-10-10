const { Router } = require('express');
const ctrl = require('../controllers/estadistica.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

const router = Router();

router.use(authenticate);

// Cada tabla de Estadísticas es una sección con su permiso: las de jugadores
// usan el listado por jugador; Estadísticas Equipo, el del equipo.
router.get('/', authorize('estadisticas_convocatorias', 'estadisticas_tiempo', 'estadisticas_goles', 'estadisticas_sanciones'), ctrl.listar);
router.get('/equipo', authorize('estadisticas_equipo'), ctrl.equipo);

module.exports = router;
