const { Router } = require('express');
const ctrl = require('../controllers/calendario.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

const router = Router();

router.use(authenticate, authorize('calendario'));

// Solo lectura: GET /api/calendario?desde=...&hasta=...&id_categoria=...
router.get('/', ctrl.eventos);
// Escudos bajo demanda: GET /api/calendario/escudos?ids=1,2,3
router.get('/escudos', ctrl.escudos);

module.exports = router;
