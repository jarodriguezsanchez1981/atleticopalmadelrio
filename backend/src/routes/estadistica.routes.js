const { Router } = require('express');
const ctrl = require('../controllers/estadistica.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

const router = Router();

router.use(authenticate, authorize('estadisticas'));

router.get('/', ctrl.listar);
router.get('/equipo', ctrl.equipo);

module.exports = router;
