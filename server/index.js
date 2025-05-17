const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const roleRoutes = require('./routes/roleRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Middleware để ghi log request
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'Chào mừng đến với Node.js Backend!' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/role', roleRoutes);

// Error Handler
app.use(errorHandler);

// Server side CRON job để tự động cập nhật trạng thái người dùng không hoạt động
const setupInactiveUsersCron = () => {
  // Chạy mỗi 1 phút để kiểm tra người dùng không hoạt động
  setInterval(async () => {
    try {
      // Gọi controller kiểm tra người dùng không hoạt động
      const userController = require('./controllers/userController');
      const req = {
        ip: '127.0.0.1',
        body: { threshold: 3 }, // Người dùng không hoạt động quá 3 phút
        headers: {}
      };
      
      const res = {
        json: (data) => {
          if (data.affected > 0) {
            console.log(`Cập nhật trạng thái offline cho ${data.affected} người dùng không hoạt động`);
          }
        },
        status: (code) => {
          return {
            json: (data) => {
              console.error('Lỗi khi kiểm tra người dùng không hoạt động:', data);
            }
          };
        }
      };
      
      await userController.checkInactiveUsers(req, res);
    } catch (error) {
      console.error('Lỗi khi chạy cron job kiểm tra người dùng không hoạt động:', error);
    }
  }, 60 * 1000); // 1 phút
};

// Khởi động server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server đang chạy trên cổng ${PORT}`);
    setupInactiveUsersCron();
    console.log('Đã khởi tạo cron job kiểm tra người dùng không hoạt động');
});
