const express = require('express');
const router = express.Router();
const userController = require('./controllers/userController');
const roleController = require('./controllers/roleController');
const friendshipController = require('./controllers/friendshipController');
const conversationController = require('./controllers/conversationController');
const messageController = require('./controllers/messageController');

// User routes
router.get('/user/data', userController.getUsers);
router.post('/user/send', userController.createUser);
router.put('/user/update/:id', userController.updateUser);
router.delete('/user/delete/:id', userController.deleteUser);
router.post('/user/login', userController.login);
router.post('/user/lock', userController.lockUser);
router.post('/user/unlock/:id', userController.unlockUser);
router.post('/user/update-status', userController.updateStatus);
router.post('/user/update-status-beacon', userController.updateStatusBeacon);
router.post('/user/update-last-activity', userController.updateLastActivity);
router.post('/user/heartbeat', userController.heartbeat);
router.post('/user/appeal', userController.sendAccountAppeal);
router.get('/user/check-lock-status/:id', userController.checkAccountLockStatus);
router.get('/user/lock-history', userController.getLockHistory);

// Role routes
router.get('/role/data', roleController.getRoles);
router.post('/role/send', roleController.createRole);
router.put('/role/update/:id', roleController.updateRole);
router.delete('/role/delete/:id', roleController.deleteRole);

// Friendship routes
router.post('/friendship/send', friendshipController.sendFriendRequest);
router.put('/friendship/accept/:id', friendshipController.acceptFriendRequest);
router.delete('/friendship/reject/:id', friendshipController.rejectFriendRequest);
router.delete('/friendship/remove/:id', friendshipController.removeFriend);
router.get('/friendship/friends/:id', friendshipController.getFriends);
router.get('/friendship/received/:id', friendshipController.getReceivedFriendRequests);
router.get('/friendship/sent/:id', friendshipController.getSentFriendRequests);
router.get('/friendship/status', friendshipController.checkFriendshipStatus);

// Conversation routes
router.get('/conversations/user/:userId', conversationController.getUserConversations);
router.get('/conversations/:conversationId', conversationController.getConversationDetails);
router.post('/conversations/create', conversationController.createConversation);
router.post('/conversations/one-to-one', conversationController.getOrCreateOneToOneConversation);

// Message routes
router.get('/messages/conversation/:conversationId', messageController.getConversationMessages);
router.post('/messages/send', messageController.sendMessage);
router.put('/messages/mark-read/:messageId', messageController.markMessageAsRead);
router.put('/messages/mark-all-read', messageController.markAllMessagesAsRead);

module.exports = router; 