const { Router } = require('express');
const ctrl = require('../controllers/entrenamientoJugador.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('entrenamientos_jugadores'));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('entrenamientos_jugadores'), ctrl.crear);
router.put('/:id', requireEditar('entrenamientos_jugadores'), ctrl.actualizar);
router.delete('/:id', requireEditar('entrenamientos_jugadores'), ctrl.eliminar);

module.exports = router;