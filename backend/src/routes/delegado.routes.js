const { Router } = require('express');
const ctrl = require('../controllers/delegado.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('delegados'));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('delegados'), ctrl.crear);
router.put('/:id', requireEditar('delegados'), ctrl.actualizar);
router.delete('/:id', requireEditar('delegados'), ctrl.eliminar);

module.exports = router;