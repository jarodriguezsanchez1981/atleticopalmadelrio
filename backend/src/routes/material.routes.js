const { Router } = require('express');
const ctrl = require('../controllers/material.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('material'));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('material'), ctrl.crear);
router.put('/:id', requireEditar('material'), ctrl.actualizar);
router.delete('/:id', requireEditar('material'), ctrl.eliminar);

module.exports = router;
