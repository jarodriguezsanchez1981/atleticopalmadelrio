const { Router } = require('express');
const ctrl = require('../controllers/patrocinador.controller');
const authenticate = require('../middlewares/auth.middleware');
const requireNivel = require('../middlewares/nivel.middleware');

const router = Router();

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', authenticate, requireNivel(), ctrl.crear);
router.put('/:id', authenticate, requireNivel(), ctrl.actualizar);
router.delete('/:id', authenticate, requireNivel(), ctrl.eliminar);

module.exports = router;
