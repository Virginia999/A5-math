const express = require('express');
const statsController = require('../controllers/statsController');
const { authenticate, authorizeRole } = require('../middlewares/auth');

const router = express.Router();

router.get('/', authenticate, authorizeRole('ADMIN'), statsController.getStats);

module.exports = router;
