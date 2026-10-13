const { Router } = require('express');
const ctrl = require('../controllers/tipoPersonal.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

// Leer los tipos también desde Personal y Plantillas (desplegable y etiquetas).
router.get('/', authenticate, authorize('tipo_personal', 'personal', 'plantillas'), ctrl.listar);
router.use(authenticate, authorize('tipo_personal'));
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('tipo_personal'), ctrl.crear);
router.put('/:id', requireEditar('tipo_personal'), ctrl.actualizar);
router.delete('/:id', requireEditar('tipo_personal'), ctrl.eliminar);

module.exports = router;
