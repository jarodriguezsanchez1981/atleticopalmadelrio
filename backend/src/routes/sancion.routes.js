const { Router } = require('express');
const ctrl = require('../controllers/sancion.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('sanciones'));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('sanciones'), ctrl.crear);
router.put('/:id', requireEditar('sanciones'), ctrl.actualizar);
router.delete('/:id', requireEditar('sanciones'), ctrl.eliminar);

module.exports = router;
