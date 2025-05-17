const pool = require('../db');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

const userService = {
  getAllUsers: async () => {
    // Truy vấn để lấy thông tin người dùng và thông tin khóa (nếu có)
    const [rows] = await pool.query(
      `SELECT users.*, role.role_name, 
       user_lock.lock_id, user_lock.reason, user_lock.status AS lock_status, user_lock.lock_time, user_lock.unlock_time 
       FROM users 
       JOIN role ON users.role_id = role.role_id 
       LEFT JOIN user_lock ON users.user_id = user_lock.user_id`
    );
    return rows;
  },

  createUser: async (userData) => {
    const { username, email, password, birthday, role_id } = userData;
    
    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password, birthday, role_id) VALUES (?, ?, ?, ?, ?)',
      [username, email, hashedPassword, birthday, role_id]
    );
    
    return {
      id: result.insertId,
      username,
      email,
      role_id
    };
  },

  updateUser: async (userId, userData) => {
    const { username, email, birthday, role_id, password } = userData;
    let hashedPassword = undefined;
    
    // Nếu có cập nhật mật khẩu
    if (password) {
      hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    }
    
    // Cập nhật thông tin cơ bản
    let query = 'UPDATE users SET username = ?, email = ?, birthday = ?, role_id = ?';
    let params = [username, email, birthday, role_id];
    
    // Nếu có mật khẩu mới, thêm vào câu query
    if (hashedPassword) {
      query += ', password = ?';
      params.push(hashedPassword);
    }
    
    query += ' WHERE user_id = ?';
    params.push(userId);
    
    const [result] = await pool.query(query, params);
    
    if (result.affectedRows === 0) {
      throw new Error('Không tìm thấy user');
    }
    
    return {
      user_id: userId,
      username,
      email,
      role_id
    };
  },

  deleteUser: async (userId) => {
    const [result] = await pool.query('DELETE FROM users WHERE user_id = ?', [userId]);
    
    if (result.affectedRows === 0) {
      throw new Error('Không tìm thấy user');
    }
    
    return true;
  },

  lockUser: async (lockData) => {
    const { user_id, reason, lock_time, unlock_time, status } = lockData;
    
    // Kiểm tra user có tồn tại không
    const [userRows] = await pool.query('SELECT * FROM users WHERE user_id = ?', [user_id]);
    
    if (userRows.length === 0) {
      throw new Error('Không tìm thấy user');
    }
    
    // Kiểm tra xem đã có bản ghi lock cho user này chưa
    const [existingLock] = await pool.query('SELECT * FROM user_lock WHERE user_id = ?', [user_id]);
    
    if (existingLock.length > 0) {
      // Nếu đã có, cập nhật thông tin khóa
      const [result] = await pool.query(
        'UPDATE user_lock SET reason = ?, lock_time = ?, unlock_time = ?, status = ? WHERE user_id = ?',
        [reason, lock_time, unlock_time, status, user_id]
      );
      
      if (result.affectedRows === 0) {
        throw new Error('Không thể khóa tài khoản');
      }
    } else {
      // Nếu chưa có, tạo mới
      const [result] = await pool.query(
        'INSERT INTO user_lock (user_id, reason, lock_time, unlock_time, status) VALUES (?, ?, ?, ?, ?)',
        [user_id, reason, lock_time, unlock_time, status]
      );
      
      if (result.affectedRows === 0) {
        throw new Error('Không thể khóa tài khoản');
      }
    }
    
    return {
      user_id,
      status,
      lock_time,
      unlock_time
    };
  },

  // Hàm kiểm tra mật khẩu
  verifyPassword: async (plainPassword, hashedPassword) => {
    return await bcrypt.compare(plainPassword, hashedPassword);
  },

  unlockUser: async (userId) => {
    // Kiểm tra user có tồn tại không
    const [userRows] = await pool.query('SELECT * FROM users WHERE user_id = ?', [userId]);
    
    if (userRows.length === 0) {
      throw new Error('Không tìm thấy user');
    }
    
    // Kiểm tra xem có bản ghi khóa nào cho user này không
    const [existingLock] = await pool.query('SELECT * FROM user_lock WHERE user_id = ?', [userId]);
    
    if (existingLock.length === 0) {
      throw new Error('Tài khoản không bị khóa');
    }
    
    // Cập nhật trạng thái thành "unlocked"
    const [result] = await pool.query(
      'UPDATE user_lock SET status = ? WHERE user_id = ?',
      ['unlocked', userId]
    );
    
    if (result.affectedRows === 0) {
      throw new Error('Không thể mở khóa tài khoản');
    }
    
    return {
      user_id: userId,
      status: 'unlocked'
    };
  },

  // Cập nhật trạng thái user (online/offline)
  updateUserStatus: async (userId, status) => {
    console.log(`Service - Cập nhật trạng thái ${status} cho user ${userId}`);
    
    try {
      // Kiểm tra xem cột status đã tồn tại trong bảng users chưa
      console.log('Kiểm tra cấu trúc bảng users...');
      const [columns] = await pool.query(`SHOW COLUMNS FROM users LIKE 'status'`);
      
      if (columns.length === 0) {
        // Nếu cột status chưa tồn tại, thêm cột này vào bảng users
        console.log('Cột status chưa tồn tại, đang thêm cột...');
        await pool.query(`ALTER TABLE users ADD COLUMN status ENUM('online', 'offline') DEFAULT 'offline'`);
        console.log('Đã thêm cột status vào bảng users');
      } else {
        console.log('Cột status đã tồn tại');
      }
      
      // Kiểm tra user có tồn tại không
      const [userRows] = await pool.query('SELECT * FROM users WHERE user_id = ?', [userId]);
      console.log('Kết quả tìm user:', { foundUsers: userRows.length, userExists: userRows.length > 0 });
      
      if (userRows.length === 0) {
        console.log('Không tìm thấy user với ID:', userId);
        throw new Error('Không tìm thấy user');
      }
      
      // Cập nhật trạng thái online/offline vào cột status của bảng users
      console.log('Thực hiện query để cập nhật status:', { status, userId });
      const [result] = await pool.query(
        'UPDATE users SET status = ? WHERE user_id = ?',
        [status, userId]
      );
      
      console.log('Kết quả UPDATE:', result);
      
      if (result.affectedRows === 0) {
        console.log('Không thể cập nhật trạng thái - affected rows = 0');
        throw new Error('Không thể cập nhật trạng thái');
      }
      
      console.log('Cập nhật trạng thái thành công');
      return {
        user_id: userId,
        status
      };
    } catch (error) {
      console.error('Lỗi SQL khi cập nhật trạng thái:', error.message);
      throw error;
    }
  },

  // Lấy lịch sử khóa tài khoản
  getLockHistory: async () => {
    // Lấy toàn bộ lịch sử khóa tài khoản từ bảng user_lock
    const [rows] = await pool.query(
      `SELECT ul.*, u.username, u.email, r.role_name
       FROM user_lock ul
       JOIN users u ON ul.user_id = u.user_id
       JOIN role r ON u.role_id = r.role_id
       ORDER BY lock_time DESC`
    );
    return rows;
  }
};

module.exports = userService; 