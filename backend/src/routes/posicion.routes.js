const { Router } = require('express');
const ctrl = require('../controllers/posicion.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('posicion'));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('posicion'), ctrl.crear);
router.put('/:id', requireEditar('posicion'), ctrl.actualizar);
router.delete('/:id', requireEditar('posicion'), ctrl.eliminar);

module.exports = router;
