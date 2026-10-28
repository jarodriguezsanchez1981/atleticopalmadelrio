const { Router } = require('express');
const ctrl = require('../controllers/import.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('administracion'));
router.post('/:recurso', requireEditar('administracion'), ctrl.importar);

module.exports = router;
