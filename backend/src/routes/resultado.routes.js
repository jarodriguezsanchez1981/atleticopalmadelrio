const { Router } = require('express');
const ctrl = require('../controllers/resultado.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('resultados'));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('resultados'), ctrl.crear);
router.put('/:id', requireEditar('resultados'), ctrl.actualizar);
router.delete('/:id', requireEditar('resultados'), ctrl.eliminar);

module.exports = router;