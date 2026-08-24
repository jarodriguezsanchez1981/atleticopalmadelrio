const { Router } = require('express');
const ctrl = require('../controllers/import.controller');
const authenticate = require('../middlewares/auth.middleware');
const requireNivel = require('../middlewares/nivel.middleware');

const router = Router();

router.use(authenticate);
router.post('/:recurso', requireNivel(), ctrl.importar);

module.exports = router;
