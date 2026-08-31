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
router.post('/', requireEditar(), ctrl.crear);
router.put('/:id', requireEditar(), ctrl.actualizar);
router.delete('/:id', requireEditar(), ctrl.eliminar);

module.exports = router;
