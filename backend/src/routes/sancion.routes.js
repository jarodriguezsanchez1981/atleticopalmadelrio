const { Router } = require('express');
const { restringirACategoria, porPlantilla, plantillaSuya } = require('../middlewares/categoria.middleware');
const { Sancion, Partido } = require('../models');
const ctrl = require('../controllers/sancion.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('sanciones'));
// Un entrenador solo ve y toca lo de su categoría (middlewares/categoria.middleware.js).
// La sanción es del partido: cuenta la plantilla del partido.
const plantillaDelPartido = async (idPartido, ctx) => {
  const p = await Partido.findByPk(idPartido, { attributes: ['id', 'id_plantilla'] });
  return p ? plantillaSuya(p.id_plantilla, ctx) : false;
};
router.use(restringirACategoria({
  registro: async (id, ctx) => {
    const s = await Sancion.findByPk(id, { attributes: ['id', 'id_partido'] });
    return s ? plantillaDelPartido(s.id_partido, ctx) : null;
  },
  cuerpo: async (body, ctx) => body.id_partido == null || plantillaDelPartido(body.id_partido, ctx),
  enListado: async (item, ctx) => (item.partido?.id_plantilla != null
    ? plantillaSuya(item.partido.id_plantilla, ctx)
    : plantillaDelPartido(item.id_partido, ctx))
}));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('sanciones'), ctrl.crear);
router.put('/:id', requireEditar('sanciones'), ctrl.actualizar);
router.delete('/:id', requireEditar('sanciones'), ctrl.eliminar);

module.exports = router;
