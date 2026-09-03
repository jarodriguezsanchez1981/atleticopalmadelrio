const { Router } = require('express');
const ctrl = require('../controllers/temporada.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('temporadas'));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('temporadas'), ctrl.crear);
router.put('/:id', requireEditar('temporadas'), ctrl.actualizar);
router.delete('/:id', requireEditar('temporadas'), ctrl.eliminar);

module.exports = router;
