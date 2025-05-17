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

  // Lấy thông tin người dùng theo ID
  getUserById: async (userId) => {
    const [rows] = await pool.query(
      `SELECT users.*, role.role_name, 
       user_lock.lock_id, user_lock.reason, user_lock.status AS lock_status, user_lock.lock_time, user_lock.unlock_time 
       FROM users 
       JOIN role ON users.role_id = role.role_id 
       LEFT JOIN user_lock ON users.user_id = user_lock.user_id
       WHERE users.user_id = ?`,
      [userId]
    );
    
    if (rows.length === 0) {
      throw new Error('Không tìm thấy user');
    }
    
    return rows[0];
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
    try {
      // Kiểm tra xem cột status đã tồn tại trong bảng users chưa
      const [columns] = await pool.query(`SHOW COLUMNS FROM users LIKE 'status'`);
      
      if (columns.length === 0) {
        // Nếu cột status chưa tồn tại, thêm cột này vào bảng users
        await pool.query(`ALTER TABLE users ADD COLUMN status ENUM('online', 'offline') DEFAULT 'offline'`);
      } else if (columns[0].Type !== "enum('online','offline')") {
        // Cập nhật kiểu dữ liệu nếu khác
        await pool.query(`ALTER TABLE users MODIFY COLUMN status ENUM('online', 'offline') DEFAULT 'offline'`);
        
        // Cập nhật trạng thái away thành offline
        await pool.query(`UPDATE users SET status = 'offline' WHERE status = 'away'`);
      }
      
      // Kiểm tra user có tồn tại không
      const [userRows] = await pool.query('SELECT * FROM users WHERE user_id = ?', [userId]);
      
      if (userRows.length === 0) {
        throw new Error('Không tìm thấy user');
      }
      
      // Cập nhật trạng thái online/offline vào cột status của bảng users
      const [result] = await pool.query(
        'UPDATE users SET status = ? WHERE user_id = ?',
        [status, userId]
      );
      
      if (result.affectedRows === 0) {
        throw new Error('Không thể cập nhật trạng thái');
      }
      
      return {
        user_id: userId,
        status
      };
    } catch (error) {
      console.error('Lỗi SQL khi cập nhật trạng thái:', error.message);
      throw error;
    }
  },

  // Cập nhật thời gian hoạt động cuối cùng của người dùng
  updateLastActivityTime: async (userId) => {
    try {
      // Kiểm tra xem cột last_activity đã tồn tại trong bảng users chưa
      const [columns] = await pool.query(`SHOW COLUMNS FROM users LIKE 'last_activity'`);
      
      if (columns.length === 0) {
        // Nếu cột last_activity chưa tồn tại, thêm cột này vào bảng users
        await pool.query(`ALTER TABLE users ADD COLUMN last_activity TIMESTAMP NULL DEFAULT NULL`);
        console.log('Đã thêm cột last_activity vào bảng users');
      }
      
      // Cập nhật thời gian hoạt động cuối cùng
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const [result] = await pool.query(
        'UPDATE users SET last_activity = ? WHERE user_id = ?',
        [now, userId]
      );
      
      if (result.affectedRows === 0) {
        console.log('Không thể cập nhật thời gian hoạt động - affected rows = 0');
        throw new Error('Không thể cập nhật thời gian hoạt động');
      }
      
      return {
        user_id: userId,
        last_activity: now
      };
    } catch (error) {
      console.error('Lỗi SQL khi cập nhật thời gian hoạt động:', error.message);
      throw error;
    }
  },
  
  // Cập nhật trạng thái offline cho người dùng không hoạt động
  updateInactiveUsers: async (inactiveThresholdMinutes = 5) => {
    try {
      // Kiểm tra xem cột last_activity đã tồn tại trong bảng users chưa
      const [columns] = await pool.query(`SHOW COLUMNS FROM users LIKE 'last_activity'`);
      
      if (columns.length === 0) {
        // Không có cột last_activity, không thể xác định người dùng không hoạt động
        return {
          affected: 0,
          users: []
        };
      }
      
      // Tính thời gian ngưỡng (thời điểm trước đó inactiveThresholdMinutes phút)
      const thresholdMinutes = inactiveThresholdMinutes || 5;
      
      // Tìm những người dùng đang online nhưng không hoạt động trong khoảng thời gian quy định
      const [inactiveUsers] = await pool.query(
        `SELECT user_id, username, email, status, last_activity 
         FROM users 
         WHERE status = 'online' 
         AND (last_activity IS NULL OR last_activity < DATE_SUB(NOW(), INTERVAL ? MINUTE))`,
        [thresholdMinutes]
      );
      
      if (inactiveUsers.length === 0) {
        return {
          affected: 0,
          users: []
        };
      }
      
      // Danh sách ID người dùng cần cập nhật
      const userIds = inactiveUsers.map(user => user.user_id);
      
      // Cập nhật trạng thái offline cho tất cả người dùng không hoạt động
      const [result] = await pool.query(
        'UPDATE users SET status = ? WHERE user_id IN (?)',
        ['offline', userIds]
      );
      
      return {
        affected: result.affectedRows,
        users: inactiveUsers
      };
    } catch (error) {
      console.error('Lỗi SQL khi cập nhật người dùng không hoạt động:', error.message);
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