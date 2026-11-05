const { Router } = require('express');
const ctrl = require('../controllers/video.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

// Entrenamientos → Videos: mismos permisos que la sección Entrenamientos. Los
// vídeos son ejercicios del club, no de una categoría, así que un entrenador
// los ve todos.
const router = Router();

router.use(authenticate, authorize('entrenamientos'));

router.get('/', ctrl.listar);
router.post('/', requireEditar('entrenamientos'), ctrl.crear);
router.put('/:id', requireEditar('entrenamientos'), ctrl.actualizar);
router.delete('/:id', requireEditar('entrenamientos'), ctrl.eliminar);

// El fichero viaja como cuerpo binario (no JSON), por streaming al disco.
router.get('/:id/fichero', ctrl.verFichero);
router.put('/:id/fichero', requireEditar('entrenamientos'), ctrl.subirFichero);

module.exports = router;
