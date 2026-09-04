const { Router } = require('express');
const ctrl = require('../controllers/seccion.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

const router = Router();

router.use(authenticate, authorize('administracion'));
router.get('/', ctrl.listar);
router.put('/:id', ctrl.actualizar);
router.post('/reordenar', ctrl.reordenar);

module.exports = router;
