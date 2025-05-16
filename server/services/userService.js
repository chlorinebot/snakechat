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
    // Kiểm tra user có tồn tại không
    const [userRows] = await pool.query('SELECT * FROM users WHERE user_id = ?', [userId]);
    
    if (userRows.length === 0) {
      throw new Error('Không tìm thấy user');
    }
    
    // Thay vì cập nhật vào bảng users, chúng ta sẽ lưu trạng thái online trong localStorage phía client
    // và có thể lưu vào bảng user_online nếu cần thiết trong tương lai
    
    return {
      user_id: userId,
      status
    };
  }
};

module.exports = userService; 