const { Router } = require('express');
const ctrl = require('../controllers/usuario.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

// Sección "Administración" -> solo quien tenga esa sección asignada
router.use(authenticate, authorize('administracion'));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('administracion'), ctrl.crear);
router.put('/:id', requireEditar('administracion'), ctrl.actualizar);
router.delete('/:id', requireEditar('administracion'), ctrl.eliminar);

module.exports = router;
