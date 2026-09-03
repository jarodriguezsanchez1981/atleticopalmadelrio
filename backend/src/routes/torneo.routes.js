const { Router } = require('express');
const ctrl = require('../controllers/torneo.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('torneo'));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('torneo'), ctrl.crear);
router.put('/:id', requireEditar('torneo'), ctrl.actualizar);
router.delete('/:id', requireEditar('torneo'), ctrl.eliminar);

module.exports = router;
