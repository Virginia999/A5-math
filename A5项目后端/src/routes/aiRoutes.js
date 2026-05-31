const express = require('express');
const aiController = require('../controllers/aiController');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

router.post('/summarize', authenticate, aiController.summarize);
router.post('/optimize', authenticate, aiController.optimize);
router.post('/tags', authenticate, aiController.generateTags);
router.post('/chat', authenticate, aiController.chat);
router.get('/models', authenticate, aiController.getModels);
router.get('/chat-sessions', authenticate, aiController.getChatSessions);
router.get('/chat-sessions/:sessionId', authenticate, aiController.getChatSession);
router.delete('/chat-sessions/:sessionId', authenticate, aiController.deleteChatSession);

module.exports = router;
