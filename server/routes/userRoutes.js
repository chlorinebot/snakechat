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

// Route chặn người dùng
router.post('/block', async (req, res) => {
    try {
        const { blocker_id, blocked_id, reason, block_type } = req.body;
        
        // Ngăn chặn việc tự chặn chính mình
        if (blocker_id === blocked_id) {
            return res.status(400).json({
                success: false,
                message: 'Không thể tự chặn chính mình'
            });
        }
        
        // Kiểm tra xem người dùng có tồn tại không
        const [users] = await db.query('SELECT user_id FROM users WHERE user_id IN (?, ?)', [blocker_id, blocked_id]);
        
        if (users.length < 2) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy một trong hai người dùng'
            });
        }
        
        // Kiểm tra xem đã chặn trước đó chưa
        const [existingBlock] = await db.query(
            'SELECT * FROM user_blocks WHERE blocker_id = ? AND blocked_id = ? AND status = "active"',
            [blocker_id, blocked_id]
        );
        
        if (existingBlock.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Người dùng này đã bị chặn trước đó'
            });
        }
        
        // Xác định loại chặn (permanent hoặc temporary)
        const blockType = block_type === 'temporary' ? 'temporary' : 'permanent';
        
        // Kiểm tra xem đã từng chặn rồi bỏ chặn trước đó chưa
        const [removedBlock] = await db.query(
            'SELECT * FROM user_blocks WHERE blocker_id = ? AND blocked_id = ? AND status = "removed" ORDER BY block_id DESC LIMIT 1',
            [blocker_id, blocked_id]
        );
        
        let result;
        if (removedBlock.length > 0) {
            // Nếu đã từng chặn và bỏ chặn trước đó, cập nhật lại bản ghi đó
            console.log(`Cập nhật trạng thái chặn cho bản ghi đã có (block_id: ${removedBlock[0].block_id})`);
            [result] = await db.query(
                'UPDATE user_blocks SET status = "active", reason = ?, block_type = ?, blocked_at = NOW(), updated_at = NOW(), unblock_at = NULL WHERE block_id = ?',
                [reason || 'Không có lý do', blockType, removedBlock[0].block_id]
            );
            
            // Gán ID để trả về
            result.insertId = removedBlock[0].block_id;
        } else {
            // Nếu chưa từng chặn, tạo bản ghi mới
            console.log(`Tạo bản ghi chặn mới giữa ${blocker_id} và ${blocked_id}`);
            [result] = await db.query(
                'INSERT INTO user_blocks (blocker_id, blocked_id, reason, block_type, blocked_at, status) VALUES (?, ?, ?, ?, NOW(), "active")',
                [blocker_id, blocked_id, reason || 'Không có lý do', blockType]
            );
        }
        
        // Nếu là bạn bè, tự động hủy kết bạn
        const [friendship] = await db.query(
            `SELECT friendship_id FROM friendships 
             WHERE ((user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?))
             AND status = 'accepted'`,
            [blocker_id, blocked_id, blocked_id, blocker_id]
        );
        
        if (friendship.length > 0) {
            await db.query('DELETE FROM friendships WHERE friendship_id = ?', [friendship[0].friendship_id]);
            console.log(`Đã tự động hủy kết bạn giữa ${blocker_id} và ${blocked_id}`);
        }
        
        return res.status(201).json({
            success: true,
            message: 'Đã chặn người dùng thành công',
            data: {
                block_id: result.insertId,
                blocker_id,
                blocked_id
            }
        });
    } catch (error) {
        console.error('Lỗi khi chặn người dùng:', error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi chặn người dùng'
        });
    }
});

// Route bỏ chặn người dùng
router.delete('/unblock', async (req, res) => {
    try {
        // Lấy thông tin từ query params
        const { blocker_id, blocked_id } = req.query;
        
        if (!blocker_id || !blocked_id) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin người dùng'
            });
        }
        
        // Kiểm tra xem có chặn không
        const [existingBlock] = await db.query(
            'SELECT * FROM user_blocks WHERE blocker_id = ? AND blocked_id = ? AND status = "active"',
            [blocker_id, blocked_id]
        );
        
        if (existingBlock.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông tin chặn'
            });
        }
        
        // Cập nhật trạng thái thành "removed" thay vì xóa
        await db.query(
            'UPDATE user_blocks SET status = "removed", updated_at = NOW(), unblock_at = NOW() WHERE blocker_id = ? AND blocked_id = ? AND status = "active"',
            [blocker_id, blocked_id]
        );
        
        return res.status(200).json({
            success: true,
            message: 'Đã bỏ chặn người dùng thành công'
        });
    } catch (error) {
        console.error('Lỗi khi bỏ chặn người dùng:', error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi bỏ chặn người dùng'
        });
    }
});

// Route kiểm tra trạng thái chặn
router.get('/block-status', async (req, res) => {
    try {
        const { blocker_id, blocked_id } = req.query;
        
        if (!blocker_id || !blocked_id) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin người dùng',
                isBlocking: false
            });
        }
        
        // Kiểm tra xem có chặn không (chỉ xét status = "active")
        const [block] = await db.query(
            'SELECT block_id FROM user_blocks WHERE blocker_id = ? AND blocked_id = ? AND status = "active"',
            [blocker_id, blocked_id]
        );
        
        return res.status(200).json({
            isBlocking: block.length > 0,
            block_id: block.length > 0 ? block[0].block_id : undefined
        });
    } catch (error) {
        console.error('Lỗi khi kiểm tra trạng thái chặn:', error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi kiểm tra trạng thái chặn',
            isBlocking: false
        });
    }
});

// Route lấy danh sách người dùng bị chặn
router.get('/blocked-users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Lấy danh sách người bị chặn (chỉ xét status = "active")
        const [blocks] = await db.query(
            `SELECT ub.*, u.username, u.email, u.status, u.join_date 
             FROM user_blocks ub 
             JOIN users u ON ub.blocked_id = u.user_id 
             WHERE ub.blocker_id = ? AND ub.status = "active" 
             ORDER BY ub.blocked_at DESC`,
            [userId]
        );
        
        // Định dạng lại dữ liệu để trả về
        const blockedUsers = blocks.map(block => ({
            block_id: block.block_id,
            blocker_id: block.blocker_id,
            blocked_id: block.blocked_id,
            reason: block.reason,
            block_type: block.block_type,
            blocked_at: block.blocked_at,
            user: {
                user_id: block.blocked_id,
                username: block.username,
                email: block.email,
                status: block.status,
                join_date: block.join_date
            }
        }));
        
        return res.status(200).json({
            success: true,
            items: blockedUsers
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách người bị chặn:', error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy danh sách người bị chặn',
            items: []
        });
    }
});

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