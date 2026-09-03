const { Router } = require('express');
const ctrl = require('../controllers/titulo.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('titulos'));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('titulos'), ctrl.crear);
router.put('/:id', requireEditar('titulos'), ctrl.actualizar);
router.delete('/:id', requireEditar('titulos'), ctrl.eliminar);

module.exports = router;