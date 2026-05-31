const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router;
