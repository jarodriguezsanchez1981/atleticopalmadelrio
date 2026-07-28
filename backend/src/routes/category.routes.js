const { Router } = require('express');
const ctrl = require('../controllers/category.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = Router();
router.use(authenticate);

router.get('/', ctrl.list);
router.post('/', authorize(['admin', 'coordinador']), ctrl.create);
router.put('/:id', authorize(['admin', 'coordinador']), ctrl.update);
router.delete('/:id', authorize(['admin', 'coordinador']), ctrl.remove);

module.exports = router;
