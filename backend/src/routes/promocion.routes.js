const { Router } = require('express');
const { restringirACategoria } = require('../middlewares/categoria.middleware');
const { Promocion, Plantilla, Categoria } = require('../models');
const ctrl = require('../controllers/promocion.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const requireEditar = require('../middlewares/requireEditar');

const router = Router();

router.use(authenticate, authorize('promociones'));
// Un entrenador solo ve y toca lo de su categoría (middlewares/categoria.middleware.js).
// Un entrenador solo ve (y crea) las promociones que llegan a su categoría
// desde el grupo de categorías inmediatamente inferior: el de Senior A, las
// de Juvenil a Senior A (no las de Senior B a Senior A).
async function grupo(idCategoria, ctx) {
  const id = Number(idCategoria);
  ctx.grupos = ctx.grupos || new Map(); // caché de la petición
  if (!ctx.grupos.has(id)) {
    ctx.grupos.set(id, Categoria.findByPk(id, { attributes: ['id', 'grupo'] })
      .then((c) => (c?.grupo != null ? Number(c.grupo) : null)));
  }
  return ctx.grupos.get(id);
}
async function categoriaDePlantilla(idPlantilla) {
  const p = await Plantilla.findByPk(idPlantilla, { attributes: ['id', 'id_categoria'] });
  return p?.id_categoria ?? null;
}
const promocionSuya = async (p, ctx) => {
  if (p.id_categoria == null || Number(p.id_categoria) !== ctx.categoria || p.id_plantilla == null) return false;
  const grupoSuyo = await grupo(ctx.categoria, ctx);
  const origen = p.plantilla?.id_categoria ?? await categoriaDePlantilla(p.id_plantilla);
  const grupoOrigen = origen != null ? await grupo(origen, ctx) : null;
  return grupoSuyo != null && grupoOrigen != null && grupoOrigen === grupoSuyo - 1;
};
router.use(restringirACategoria({
  listados: ['/', '/resumen'],
  registro: async (id, ctx) => {
    const p = await Promocion.findByPk(id, { attributes: ['id', 'id_plantilla', 'id_categoria'] });
    return p ? promocionSuya(p, ctx) : null;
  },
  cuerpo: async (body, ctx) => (body.id_plantilla == null && body.id_categoria == null) || promocionSuya(body, ctx),
  enListado: promocionSuya
}));

router.get('/', ctrl.listar);
router.get('/resumen', ctrl.resumen);
router.get('/:id', ctrl.obtener);
router.post('/', requireEditar('promociones'), ctrl.crear);
router.put('/:id', requireEditar('promociones'), ctrl.actualizar);
router.delete('/:id', requireEditar('promociones'), ctrl.eliminar);

module.exports = router;
