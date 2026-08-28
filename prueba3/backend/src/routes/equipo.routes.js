const { Router } = require('express');
const ctrl = require('../controllers/equipo.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('equipos'));

router.get('/', ctrl.listar);
router.get('/descargar-escudos', ctrl.descargarEscudos);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar(), ctrl.crear);
router.put('/:id', requireEditar(), ctrl.actualizar);
router.delete('/:id', requireEditar(), ctrl.eliminar);

module.exports = router;
