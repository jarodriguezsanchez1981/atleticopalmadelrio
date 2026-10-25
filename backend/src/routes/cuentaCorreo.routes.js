const { Router } = require('express');
const ctrl = require('../controllers/cuentaCorreo.controller');
const authenticate = require('../middlewares/auth.middleware');
const soloAdmin = require('../middlewares/soloAdmin');

const router = Router();

// Cuentas de correo internas: solo el usuario admin (no va por permisos de
// sección). Datos sensibles (credenciales SMTP).
router.use(authenticate, soloAdmin);

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', ctrl.crear);
router.put('/:id', ctrl.actualizar);
router.delete('/:id', ctrl.eliminar);
router.post('/:id/probar', ctrl.probar);

module.exports = router;
