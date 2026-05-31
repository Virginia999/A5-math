const express = require('express');
const tagController = require('../controllers/tagController');
const { authenticate, authorizeRole } = require('../middlewares/auth');

const router = express.Router();

router.get('/', authenticate, tagController.getTags);
router.post('/', authenticate, authorizeRole('ADMIN'), tagController.createTag);
router.put('/:id', authenticate, authorizeRole('ADMIN'), tagController.updateTag);
router.delete('/:id', authenticate, authorizeRole('ADMIN'), tagController.deleteTag);

module.exports = router;
