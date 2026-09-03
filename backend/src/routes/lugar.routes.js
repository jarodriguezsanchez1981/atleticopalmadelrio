const { Router } = require('express');
const ctrl = require('../controllers/lugar.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('lugares'));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('lugares'), ctrl.crear);
router.put('/:id', requireEditar('lugares'), ctrl.actualizar);
router.delete('/:id', requireEditar('lugares'), ctrl.eliminar);

module.exports = router;
