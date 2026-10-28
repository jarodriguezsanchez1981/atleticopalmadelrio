const { Router } = require('express');
const { restringirACategoria, porPlantilla, plantillaSuya } = require('../middlewares/categoria.middleware');
const { Partido } = require('../models');
const ctrl = require('../controllers/partido.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('partidos'));
// Un entrenador solo ve y toca lo de su categoría (middlewares/categoria.middleware.js).
router.use(restringirACategoria(porPlantilla(Partido)));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('partidos'), ctrl.crear);
router.put('/:id', requireEditar('partidos'), ctrl.actualizar);
router.delete('/:id', requireEditar('partidos'), ctrl.eliminar);
router.post('/:id/finalizar-acta', requireEditar('partidos'), ctrl.finalizarActa);

module.exports = router;
