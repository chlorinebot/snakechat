// Tạo script để kiểm tra cấu trúc bảng users
const pool = require('./db');

async function test() {
  try {
    const [columns] = await pool.query('SHOW COLUMNS FROM users');
    console.log('Cấu trúc bảng users:');
    console.log(columns);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

test(); 