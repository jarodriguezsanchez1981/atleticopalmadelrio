const { Router } = require('express');
const ctrl = require('../controllers/plantilla.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('plantillas'));

router.get('/', ctrl.listar);
router.post('/temporada', requireEditar('plantillas'), ctrl.crearParaTemporada);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('plantillas'), ctrl.crear);
router.put('/:id', requireEditar('plantillas'), ctrl.actualizar);
router.delete('/:id', requireEditar('plantillas'), ctrl.eliminar);

module.exports = router;
