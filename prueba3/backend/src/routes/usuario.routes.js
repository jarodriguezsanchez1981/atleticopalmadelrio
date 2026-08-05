const { Router } = require('express');
const ctrl = require('../controllers/usuario.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

const router = Router();

// Sección "Administración" -> solo quien tenga esa sección asignada
router.use(authenticate, authorize('administracion'));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', ctrl.crear);
router.put('/:id', ctrl.actualizar);
router.delete('/:id', ctrl.eliminar);

module.exports = router;
