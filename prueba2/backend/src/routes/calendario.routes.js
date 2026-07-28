const { Router } = require('express');
const ctrl = require('../controllers/calendario.controller');
const authenticate = require('../middlewares/auth.middleware');

const router = Router();

router.use(authenticate);

// Único endpoint, de solo lectura: GET /api/calendario?desde=...&hasta=...&id_categoria=...
router.get('/', ctrl.eventos);

module.exports = router;
