const { Router } = require('express');
const ctrl = require('../controllers/division.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('division'));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('division'), ctrl.crear);
router.put('/:id', requireEditar('division'), ctrl.actualizar);
router.delete('/:id', requireEditar('division'), ctrl.eliminar);

module.exports = router;