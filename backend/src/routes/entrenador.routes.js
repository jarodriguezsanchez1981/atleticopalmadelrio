const { Router } = require('express');
const ctrl = require('../controllers/entrenador.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('entrenadores'));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('entrenadores'), ctrl.crear);
router.put('/:id', requireEditar('entrenadores'), ctrl.actualizar);
router.delete('/:id', requireEditar('entrenadores'), ctrl.eliminar);

module.exports = router;
