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
router.post('/', requireEditar('equipos'), ctrl.crear);
router.put('/:id', requireEditar('equipos'), ctrl.actualizar);
router.delete('/:id', requireEditar('equipos'), ctrl.eliminar);

module.exports = router;
