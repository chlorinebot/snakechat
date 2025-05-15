const userService = require('../services/userService');

const userController = {
  // Lấy danh sách users với vai trò
  getAllUsers: async (req, res) => {
    try {
      const users = await userService.getAllUsers();
      res.json({ 
        success: true,
        message: 'Lấy dữ liệu thành công',
        items: users 
      });
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu:', error);
      res.status(500).json({ 
        success: false,
        message: 'Lỗi khi lấy dữ liệu từ server'
      });
    }
  },

  // Thêm user mới
  createUser: async (req, res) => {
    const { username, email, password, birthday, role_id } = req.body;
    if (!username || !email || !password || !role_id) {
      return res.status(400).json({ 
        success: false,
        message: 'Thiếu thông tin yêu cầu'
      });
    }

    try {
      const newUser = await userService.createUser({
        username,
        email,
        password, // Mật khẩu sẽ được mã hóa trong service
        birthday,
        role_id
      });

      res.json({ 
        success: true,
        message: `Đã thêm user ${username} thành công`,
        data: newUser
      });
    } catch (error) {
      console.error('Lỗi khi thêm user:', error);
      res.status(500).json({ 
        success: false,
        message: 'Lỗi khi thêm user vào database'
      });
    }
  }
};

module.exports = userController; 