// Tạo script để kiểm tra và thêm cột last_activity nếu chưa tồn tại
const pool = require('./db');

async function test() {
  try {
    // Kiểm tra xem cột last_activity đã tồn tại trong bảng users chưa
    const [columns] = await pool.query(`SHOW COLUMNS FROM users LIKE 'last_activity'`);
    console.log('Kiểm tra cột last_activity:');
    console.log(columns);
    
    if (columns.length === 0) {
      // Nếu cột last_activity chưa tồn tại, thêm cột này vào bảng users
      console.log('Thêm cột last_activity vào bảng users...');
      await pool.query(`ALTER TABLE users ADD COLUMN last_activity TIMESTAMP NULL DEFAULT NULL`);
      console.log('Đã thêm cột last_activity thành công!');
    } else {
      console.log('Cột last_activity đã tồn tại trong bảng users.');
    }
    
    // Cập nhật thời gian hoạt động cuối cùng cho tất cả người dùng đang online
    console.log('Cập nhật thời gian hoạt động cho người dùng online...');
    await pool.query(`UPDATE users SET last_activity = NOW() WHERE status = 'online'`);
    console.log('Đã cập nhật thời gian hoạt động cho người dùng online.');
    
    // Kiểm tra lại
    const [users] = await pool.query(`SELECT user_id, username, status, last_activity FROM users LIMIT 5`);
    console.log('Mẫu 5 người dùng đầu tiên:');
    console.log(users);
    
  } catch (err) {
    console.error('Lỗi:', err);
  } finally {
    console.log('Hoàn tất kiểm tra và cập nhật.');
    process.exit(0);
  }
}

test(); 