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

// Route lấy lịch sử khóa tài khoản
router.get('/lock-history', userController.getLockHistory);

module.exports = router; 