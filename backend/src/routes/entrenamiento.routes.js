const { Router } = require('express');
const { restringirACategoria, porPlantilla, plantillaSuya } = require('../middlewares/categoria.middleware');
const { Entrenamiento } = require('../models');
const ctrl = require('../controllers/entrenamiento.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('entrenamientos'));
// Un entrenador solo ve y toca lo de su categoría (middlewares/categoria.middleware.js).
router.use(restringirACategoria(porPlantilla(Entrenamiento)));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('entrenamientos'), ctrl.crear);
router.put('/:id', requireEditar('entrenamientos'), ctrl.actualizar);
router.delete('/:id', requireEditar('entrenamientos'), ctrl.eliminar);

// Adjunto de la sesión (PDF o imagen con la planificación). El base64 del PUT
// usa un parser con límite ampliado (app.js).
router.get('/:id/adjunto', ctrl.descargarAdjunto);
router.put('/:id/adjunto', requireEditar('entrenamientos'), ctrl.subirAdjunto);
router.delete('/:id/adjunto', requireEditar('entrenamientos'), ctrl.eliminarAdjunto);

module.exports = router;
