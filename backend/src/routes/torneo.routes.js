const { Router } = require('express');
const { restringirACategoria, porPlantilla, plantillaSuya } = require('../middlewares/categoria.middleware');
const { Torneo } = require('../models');
const ctrl = require('../controllers/torneo.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('torneo'));
// Un entrenador solo ve y toca lo de su categoría (middlewares/categoria.middleware.js).
router.use(restringirACategoria(porPlantilla(Torneo)));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('torneo'), ctrl.crear);
router.put('/:id', requireEditar('torneo'), ctrl.actualizar);
router.delete('/:id', requireEditar('torneo'), ctrl.eliminar);

module.exports = router;
