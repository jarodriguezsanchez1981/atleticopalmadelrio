const { Router } = require('express');
const ctrl = require('../controllers/seccion.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

const router = Router();

router.use(authenticate);

// El listado (icono/nombre/orden/grupo de cada sección) lo necesita
// cualquier usuario autenticado para construir su propio menú lateral;
// no es información sensible. Editar y reordenar sigue siendo solo admin.
router.get('/', ctrl.listar);
router.put('/:id', authorize('administracion'), ctrl.actualizar);
router.post('/reordenar', authorize('administracion'), ctrl.reordenar);

module.exports = router;
