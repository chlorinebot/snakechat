const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const roleRoutes = require('./routes/roleRoutes');
const errorHandler = require('./middleware/errorHandler');
const { setupInactiveUsersCron } = require('./services/cronService');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Middleware để ghi log request
app.use((req, res, next) => {
  if (req.method !== 'GET' && !(req.method === 'POST' && req.url.includes('/api/user/update-status'))) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
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

// Khởi động server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy trên cổng ${PORT} 🚀`);
    setupInactiveUsersCron();
    
});
