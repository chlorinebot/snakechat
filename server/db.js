const mysql = require('mysql2/promise');

// Cấu hình kết nối MySQL
const pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: '',
  port: '3306',
  database: 'snakechat',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Kiểm tra kết nối
const connectToDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Kết nối MySQL thành công!');
    connection.release();
    return pool;
  } catch (error) {
    console.error('❌ Lỗi kết nối MySQL:', error.message);
    throw error;
  }
};

// Khởi tạo kết nối
connectToDatabase();

module.exports = pool;
