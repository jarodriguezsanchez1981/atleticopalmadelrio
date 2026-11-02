const { Router } = require('express');
const ctrl = require('../controllers/informeSemanal.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

// Sección "Informes → Semanal" (submenú Informes de Club). No va ligada a
// plantillas: la controla el permiso de la sección.
router.use(authenticate, authorize('informe_semanal'));

router.get('/', ctrl.vista);
router.get('/historial', ctrl.historial);
router.post('/enviar', requireEditar('informe_semanal'), ctrl.enviar);
router.put('/destinatarios', requireEditar('informe_semanal'), ctrl.guardarDestinatarios);

module.exports = router;
