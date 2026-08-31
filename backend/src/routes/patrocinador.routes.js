const { Router } = require('express');
const ctrl = require('../controllers/patrocinador.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', authenticate, requireEditar(), ctrl.crear);
router.put('/:id', authenticate, requireEditar(), ctrl.actualizar);
router.delete('/:id', authenticate, requireEditar(), ctrl.eliminar);

module.exports = router;
