const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');

// Đăng ký
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, birthday } = req.body;
        
        // Kiểm tra email đã tồn tại
        const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email đã được sử dụng' 
            });
        }

        // Mã hóa mật khẩu
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Thêm người dùng mới với role_id = 2 (người dùng)
        const [result] = await db.query(
            'INSERT INTO users (username, email, password, birthday, role_id) VALUES (?, ?, ?, ?, 2)',
            [username, email, hashedPassword, birthday]
        );

        res.status(201).json({
            success: true,
            message: 'Đăng ký thành công'
        });
    } catch (error) {
        console.error('Lỗi đăng ký:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server' 
        });
    }
});

// Đăng nhập
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Tìm user theo email
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Email hoặc mật khẩu không chính xác' 
            });
        }

        const user = users[0];

        // Kiểm tra mật khẩu
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ 
                success: false, 
                message: 'Email hoặc mật khẩu không chính xác' 
            });
        }

        // Tạo đối tượng user không chứa mật khẩu
        const userWithoutPassword = {
            id: user.user_id,
            username: user.username,
            email: user.email,
            role_id: user.role_id
        };

        res.json({
            success: true,
            message: 'Đăng nhập thành công',
            user: userWithoutPassword,
            token: 'dummy_token' // TODO: Implement JWT
        });
    } catch (error) {
        console.error('Lỗi đăng nhập:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server' 
        });
    }
});

module.exports = router; 