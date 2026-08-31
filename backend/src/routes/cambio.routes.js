const { Router } = require('express');
const ctrl = require('../controllers/cambio.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

const router = Router();

router.use(authenticate, authorize('cambios'));
router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);

module.exports = router;
