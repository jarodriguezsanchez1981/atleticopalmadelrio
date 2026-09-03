const { Router } = require('express');
const ctrl = require('../controllers/promocion.controller');
const authenticate = require('../middlewares/auth.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', authenticate, requireEditar('promociones'), ctrl.crear);
router.put('/:id', authenticate, requireEditar('promociones'), ctrl.actualizar);
router.delete('/:id', authenticate, requireEditar('promociones'), ctrl.eliminar);

module.exports = router;
