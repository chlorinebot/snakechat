const pool = require('../db');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

const userService = {
  getAllUsers: async () => {
    const [rows] = await pool.query(
      'SELECT users.*, role.role_name FROM users JOIN role ON users.role_id = role.role_id'
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

  // Hàm kiểm tra mật khẩu
  verifyPassword: async (plainPassword, hashedPassword) => {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
};

module.exports = userService; 