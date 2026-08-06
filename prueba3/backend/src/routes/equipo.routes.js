const { Router } = require('express');
const ctrl = require('../controllers/equipo.controller');
const authenticate = require('../middlewares/auth.middleware');

const router = Router();

router.use(authenticate);

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', ctrl.crear);
router.put('/:id', ctrl.actualizar);
router.delete('/:id', ctrl.eliminar);

module.exports = router;
