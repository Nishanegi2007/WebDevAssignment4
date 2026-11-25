const express = require('express');
const { users } = require('../controllers/adminController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();
router.get('/users', authenticate, requireRole('admin'), users);

module.exports = router;
