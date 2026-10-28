const { Router } = require('express');
const { restringirACategoria, porPlantilla, plantillaSuya } = require('../middlewares/categoria.middleware');
const { Partido } = require('../models');
const ctrl = require('../controllers/jornada.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('categoria_calendario'));
// Un entrenador solo ve y toca lo de su categoría (middlewares/categoria.middleware.js).
router.use(restringirACategoria(porPlantilla(Partido)));

router.get('/', ctrl.listar);
router.get('/numeros', ctrl.listarNumeros);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('categoria_calendario'), ctrl.crear);
router.put('/:id', requireEditar('categoria_calendario'), ctrl.actualizar);
router.delete('/:id', requireEditar('categoria_calendario'), ctrl.eliminar);

module.exports = router;
