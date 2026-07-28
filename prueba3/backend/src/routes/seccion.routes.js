const { Router } = require('express');
const ctrl = require('../controllers/seccion.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

const router = Router();

router.use(authenticate, authorize('administrador'));
router.get('/', ctrl.listar);

module.exports = router;
