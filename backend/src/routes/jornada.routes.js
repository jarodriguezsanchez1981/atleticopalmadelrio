const { Router } = require('express');
const ctrl = require('../controllers/jornada.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('categoria_calendario'));

router.get('/', ctrl.listar);
router.get('/numeros', ctrl.listarNumeros);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('categoria_calendario'), ctrl.crear);
router.put('/:id', requireEditar('categoria_calendario'), ctrl.actualizar);
router.delete('/:id', requireEditar('categoria_calendario'), ctrl.eliminar);

module.exports = router;
