const { Router } = require('express');
const ctrl = require('../controllers/tareas.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

const router = Router();

// Panel de tareas automáticas: solo lectura (lo rellenan las propias tareas).
router.use(authenticate, authorize('tareas'));
router.get('/', ctrl.estado);

module.exports = router;
