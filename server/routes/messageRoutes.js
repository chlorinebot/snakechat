const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

// Lấy tin nhắn trong cuộc trò chuyện
router.get('/conversation/:conversationId', messageController.getConversationMessages);

// Gửi tin nhắn mới
router.post('/send', messageController.sendMessage);

// Đánh dấu tin nhắn đã đọc
router.put('/mark-read/:messageId', messageController.markMessageAsRead);

// Đánh dấu tất cả tin nhắn trong cuộc trò chuyện đã đọc
router.put('/mark-all-read', messageController.markAllMessagesAsRead);

module.exports = router; 