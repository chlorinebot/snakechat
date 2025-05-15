const express = require('express');
const cors = require('cors');
const pool = require('./db');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'Chào mừng đến với Node.js Backend!' });
});

// API GET: Lấy danh sách users từ MySQL
app.get('/api/data', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM users');
        res.json({ 
            success: true,
            message: 'Lấy dữ liệu thành công', 
            data: rows 
        });
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu:', error);
        res.status(500).json({ 
            success: false,
            message: 'Lỗi khi lấy dữ liệu từ server'
        });
    }
});

// API POST: Thêm user mới vào MySQL
app.post('/api/send', async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ 
            success: false,
            message: 'Tên không được để trống'
        });
    }
    try {
        const [result] = await pool.query('INSERT INTO users (name) VALUES (?)', [name]);
        res.json({ 
            success: true,
            message: `Đã thêm user ${name} thành công`,
            data: { id: result.insertId, name }
        });
    } catch (error) {
        console.error('Lỗi khi thêm user:', error);
        res.status(500).json({ 
            success: false,
            message: 'Lỗi khi thêm user vào database'
        });
    }
});

// Khởi động server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy trên cổng ${PORT}`);
});
