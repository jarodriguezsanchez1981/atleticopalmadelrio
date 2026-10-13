const { Router } = require('express');
const { restringirACategoria, porPlantilla, plantillaSuya } = require('../middlewares/categoria.middleware');
const { Convocatoria } = require('../models');
const ctrl = require('../controllers/convocatoria.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('convocatorias'));
// Un entrenador solo ve y toca lo de su categoría (middlewares/categoria.middleware.js).
router.use(restringirACategoria(porPlantilla(Convocatoria)));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('convocatorias'), ctrl.crear);
router.put('/:id', requireEditar('convocatorias'), ctrl.actualizar);
router.delete('/:id', requireEditar('convocatorias'), ctrl.eliminar);

module.exports = router;
