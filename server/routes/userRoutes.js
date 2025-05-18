const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const db = require('../db');

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

// Kiểm tra trạng thái khóa của tài khoản
router.get('/check-lock-status/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Truy vấn bảng user_lock để kiểm tra tài khoản có đang bị khóa không
        const [lockInfo] = await db.query(
            `SELECT * FROM user_lock 
             WHERE user_id = ? AND unlock_time > NOW() 
             ORDER BY lock_id DESC 
             LIMIT 1`,
            [userId]
        );
        
        if (lockInfo && lockInfo.length > 0) {
            // Tài khoản đang bị khóa
            console.log(`Tài khoản ID ${userId} đang bị khóa`);
            return res.json({
                isLocked: true,
                lockInfo: {
                    user_id: lockInfo[0].user_id,
                    reason: lockInfo[0].reason,
                    lock_time: lockInfo[0].lock_time,
                    unlock_time: lockInfo[0].unlock_time
                }
            });
        }
        
        // Tài khoản không bị khóa
        return res.json({
            isLocked: false
        });
    } catch (error) {
        console.error('Lỗi khi kiểm tra trạng thái khóa tài khoản:', error);
        res.status(500).json({
            isLocked: false,
            error: 'Đã xảy ra lỗi khi kiểm tra trạng thái khóa tài khoản'
        });
    }
});

// Gửi khiếu nại cho tài khoản bị khóa
router.post('/appeal', async (req, res) => {
    try {
        const { userId, username, email, reason, explanation } = req.body;
        
        // Lưu thông tin khiếu nại vào database
        const [result] = await db.query(
            'INSERT INTO account_appeals (user_id, explanation, appeal_time, status) VALUES (?, ?, NOW(), ?)',
            [userId, explanation, 'pending']
        );
        
        console.log(`Người dùng ${username} (ID: ${userId}) đã gửi khiếu nại`);
        
        res.status(201).json({
            success: true,
            message: 'Khiếu nại đã được gửi thành công'
        });
    } catch (error) {
        console.error('Lỗi khi gửi khiếu nại:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi xử lý khiếu nại'
        });
    }
});

module.exports = router; 