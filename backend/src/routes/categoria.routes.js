const { Router } = require('express');
const ctrl = require('../controllers/categoria.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

// Todos los roles autenticados pueden ver y gestionar categorías
router.use(authenticate, authorize('categorias'));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('categorias'), ctrl.crear);
router.put('/:id', requireEditar('categorias'), ctrl.actualizar);
router.delete('/:id', requireEditar('categorias'), ctrl.eliminar);

module.exports = router;
