const { Router } = require('express');
const ctrl = require('../controllers/match.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = Router();
router.use(authenticate);

router.get('/', ctrl.listByRange);
router.get('/:id/squad', ctrl.getSquad);
router.get('/stats/player/:playerId', ctrl.playerStats);
router.get('/stats/category/:categoryId', ctrl.categoryStats);
router.patch('/:id/squad/:playerId', ctrl.updatePlayerEntry);

router.post('/', authorize(['admin', 'coordinador']), ctrl.create);
router.patch('/:id/result', authorize(['admin', 'coordinador']), ctrl.setResult);
router.delete('/:id', authorize(['admin', 'coordinador']), ctrl.remove);

module.exports = router;
