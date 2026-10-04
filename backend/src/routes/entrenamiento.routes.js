const { Router } = require('express');
const ctrl = require('../controllers/entrenamiento.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('entrenamientos'));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('entrenamientos'), ctrl.crear);
router.put('/:id', requireEditar('entrenamientos'), ctrl.actualizar);
router.delete('/:id', requireEditar('entrenamientos'), ctrl.eliminar);

module.exports = router;
