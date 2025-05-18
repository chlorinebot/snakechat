const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Route lấy danh sách users
router.get('/data', userController.getAllUsers);

// Route thêm user mới
router.post('/send', userController.createUser);

// Route cập nhật user
router.put('/update/:id', userController.updateUser);

// Route xóa user
router.delete('/delete/:id', userController.deleteUser);

// Route khóa tài khoản
router.post('/lock', userController.lockUser);

// Route mở khóa tài khoản
router.post('/unlock/:id', userController.unlockUser);

// Route cập nhật trạng thái user (online/offline)
router.post('/update-status', userController.updateUserStatus);

// Route xử lý heartbeat từ client
router.post('/heartbeat', userController.receiveUserHeartbeat);

// Route cập nhật trạng thái offline qua Beacon API (khi đóng tab)
router.post('/update-status-beacon', userController.updateUserStatusBeacon);

// Route lấy lịch sử khóa tài khoản
router.get('/lock-history', userController.getLockHistory);

// Route kiểm tra các user không hoạt động và cập nhật trạng thái offline
router.post('/check-inactive-users', userController.checkInactiveUsers);

// Route cập nhật cấu trúc cơ sở dữ liệu và thời gian hoạt động
router.get('/update-last-activity', userController.updateLastActivitySystem);

module.exports = router; 