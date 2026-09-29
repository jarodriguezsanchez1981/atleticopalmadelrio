const { Router } = require('express');
const ctrl = require('../controllers/promocion.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('promociones'));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('promociones'), ctrl.crear);
router.put('/:id', requireEditar('promociones'), ctrl.actualizar);
router.delete('/:id', requireEditar('promociones'), ctrl.eliminar);

module.exports = router;
