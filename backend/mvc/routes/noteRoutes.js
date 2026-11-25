const express = require('express');
const noteController = require('../controllers/noteController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authenticate);
router.get('/', noteController.list);
router.post('/', noteController.create);
router.put('/:id', noteController.update);
router.delete('/:id', noteController.remove);

module.exports = router;
