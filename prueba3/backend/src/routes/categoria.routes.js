const { Router } = require('express');
const ctrl = require('../controllers/categoria.controller');
const authenticate = require('../middlewares/auth.middleware');
const requireNivel = require('../middlewares/nivel.middleware');

const router = Router();

// Todos los roles autenticados pueden ver y gestionar categorías
router.use(authenticate);

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireNivel(), ctrl.crear);
router.put('/:id', requireNivel(), ctrl.actualizar);
router.delete('/:id', requireNivel(), ctrl.eliminar);

module.exports = router;
