const { Router } = require('express');
const ctrl = require('../controllers/torneoGenerado.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

// Sección "Generar Torneo" (apartado Club). No va ligada a plantillas, así que
// no lleva restringirACategoria: la controla el permiso de la sección.
router.use(authenticate, authorize('generar_torneo'));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('generar_torneo'), ctrl.crear);
router.put('/:id', requireEditar('generar_torneo'), ctrl.actualizar);
router.delete('/:id', requireEditar('generar_torneo'), ctrl.eliminar);

module.exports = router;
