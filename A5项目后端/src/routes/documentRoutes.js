const express = require('express');
const documentController = require('../controllers/documentController');
const { authenticate, authorizeRole } = require('../middlewares/auth');

const router = express.Router();

router.get('/', authenticate, documentController.getDocuments);
router.get('/:id', authenticate, documentController.getDocumentById);
router.post('/', authenticate, authorizeRole('ADMIN', 'EDITOR'), documentController.createDocument);
router.put('/:id', authenticate, authorizeRole('ADMIN', 'EDITOR'), documentController.updateDocument);
router.delete('/:id', authenticate, authorizeRole('ADMIN', 'EDITOR'), documentController.deleteDocument);

module.exports = router;
