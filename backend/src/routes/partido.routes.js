const { Router } = require('express');
const ctrl = require('../controllers/partido.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('partidos'));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('partidos'), ctrl.crear);
router.put('/:id', requireEditar('partidos'), ctrl.actualizar);
router.delete('/:id', requireEditar('partidos'), ctrl.eliminar);

module.exports = router;
