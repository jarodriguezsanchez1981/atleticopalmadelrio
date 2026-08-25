const { Router } = require('express');
const ctrl = require('../controllers/calendario.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

const router = Router();

router.use(authenticate, authorize('calendario'));

// Único endpoint, de solo lectura: GET /api/calendario?desde=...&hasta=...&id_categoria=...
router.get('/', ctrl.eventos);

module.exports = router;
