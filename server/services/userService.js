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

  // Hàm kiểm tra mật khẩu
  verifyPassword: async (plainPassword, hashedPassword) => {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
};

module.exports = userService; 