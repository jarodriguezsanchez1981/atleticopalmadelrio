const { Router } = require('express');
const ctrl = require('../controllers/seguridad.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

const router = Router();

// Estado de seguridad de Docker: solo para administradores (sección
// 'administracion'). Es de solo lectura; lo rellena el cron del EC2 en la BD.
router.use(authenticate, authorize('administracion'));
router.get('/estado', ctrl.estado);

module.exports = router;
