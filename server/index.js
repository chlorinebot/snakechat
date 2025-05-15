const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'Chào mừng đến với Node.js Backend!' });
});

// API gửi danh sách dữ liệu mẫu
app.get('/api/data', (req, res) => {
    const data = { message: 'Dữ liệu từ backend', items: [1, 2, 3] };
    res.json(data);
});

// API nhận dữ liệu từ frontend
app.post('/api/send', (req, res) => {
    const { name } = req.body;
    res.json({ message: `Xin chào, ${name}!` });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server đang chạy trên cổng ${PORT}`);
});
