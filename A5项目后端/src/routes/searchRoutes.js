const express = require('express');
const searchController = require('../controllers/searchController');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

router.get('/', authenticate, searchController.searchDocuments);

module.exports = router;
