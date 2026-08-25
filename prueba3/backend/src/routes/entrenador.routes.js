const { Router } = require('express');
const ctrl = require('../controllers/entrenador.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireNivel = require('../middlewares/nivel.middleware');

const router = Router();

router.use(authenticate, authorize('entrenadores'));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireNivel(), ctrl.crear);
router.put('/:id', requireNivel(), ctrl.actualizar);
router.delete('/:id', requireNivel(), ctrl.eliminar);

module.exports = router;
