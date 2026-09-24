const { Router } = require('express');
const ctrl = require('../controllers/convocatoria.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('convocatorias'));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('convocatorias'), ctrl.crear);
router.put('/:id', requireEditar('convocatorias'), ctrl.actualizar);
router.delete('/:id', requireEditar('convocatorias'), ctrl.eliminar);

module.exports = router;
