const express = require('express');
const router = express.Router();

const { authUser, authAdmin } = require('../auth/checkAuth');
const { asyncHandler } = require('../auth/checkAuth');

const controllerChatbot = require('../controllers/chatbot.controller');

// User routes
router.post('/create', authUser, asyncHandler(controllerChatbot.createMessager));
router.get('/get', authUser, asyncHandler(controllerChatbot.getChatbot));

// Admin routes
router.get('/admin/conversations', authAdmin, asyncHandler(controllerChatbot.getAllConversations));
router.get('/admin/conversations/:id', authAdmin, asyncHandler(controllerChatbot.getConversationDetail));
router.put('/admin/conversations/:id/status', authAdmin, asyncHandler(controllerChatbot.updateConversationStatus));
router.delete('/admin/conversations/:id', authAdmin, asyncHandler(controllerChatbot.deleteConversation));
router.post('/admin/conversations/:id/reanalyze', authAdmin, asyncHandler(controllerChatbot.reanalyzeConversation));
router.post('/admin/conversations/reanalyze-all', authAdmin, asyncHandler(controllerChatbot.reanalyzeAllConversations));

module.exports = router;
