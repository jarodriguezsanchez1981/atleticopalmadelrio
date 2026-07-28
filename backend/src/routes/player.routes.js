const { Router } = require('express');
const ctrl = require('../controllers/player.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, scopeToOwnCategory } = require('../middleware/role.middleware');

const router = Router();
router.use(authenticate);

router.get('/category/:categoryId', scopeToOwnCategory, ctrl.listByCategory);
router.get('/:id', ctrl.getOne);

router.post('/', authorize(['admin', 'coordinador']), ctrl.create);
router.put('/:id', authorize(['admin', 'coordinador']), ctrl.update);
router.delete('/:id', authorize(['admin', 'coordinador']), ctrl.remove);

module.exports = router;
