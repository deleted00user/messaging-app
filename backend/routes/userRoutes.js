const express = require('express');
const userRouter = express.Router();
const userController = require('../controllers/userController');
const authenticateToken = require('../middleware/authMiddleware');

userRouter.get('/me', authenticateToken, userController.getMyProfile)

userRouter.put('/me', authenticateToken, userController.updateMyProfile)

userRouter.get('/search', authenticateToken, userController.searchUsers)

userRouter.get('/:id', authenticateToken, userController.getUserProfile)

module.exports = userRouter;