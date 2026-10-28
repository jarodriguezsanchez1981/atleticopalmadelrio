const { Router } = require('express');
const ctrl = require('../controllers/coordinador.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('coordinadores'));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('coordinadores'), ctrl.crear);
router.put('/:id', requireEditar('coordinadores'), ctrl.actualizar);
router.delete('/:id', requireEditar('coordinadores'), ctrl.eliminar);

module.exports = router;
