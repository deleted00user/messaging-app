const express = require('express');
const messageRouter = express.Router();
const messageController = require('../controllers/messageController');
const authenticateToken = require('../middleware/authMiddleware');

messageRouter.post('/', authenticateToken, messageController.sendMessage);

messageRouter.get('/conversations', authenticateToken, messageController.getConversations);

messageRouter.get('/:userId', authenticateToken, messageController.getMessages);

messageRouter.put('/:id', authenticateToken, messageController.editMessage);

messageRouter.delete('/:id', authenticateToken, messageController.deleteMessage);

module.exports = messageRouter;