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

module.exports = router; 