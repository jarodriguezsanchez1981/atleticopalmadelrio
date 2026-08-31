const { Router } = require('express');
const ctrl = require('../controllers/tipofutbol.controller');
const authenticate = require('../middlewares/auth.middleware');

const router = Router();

router.use(authenticate);

// Solo consulta: el catálogo se fija en el seed (Futbol 7 / Futbol 11)
router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);

module.exports = router;