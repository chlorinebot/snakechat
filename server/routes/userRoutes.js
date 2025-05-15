const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Route lấy danh sách users
router.get('/data', userController.getAllUsers);

// Route thêm user mới
router.post('/send', userController.createUser);

module.exports = router; 