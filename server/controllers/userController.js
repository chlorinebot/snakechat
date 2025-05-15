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
  },

  // Cập nhật thông tin user
  updateUser: async (req, res) => {
    const userId = req.params.id;
    const { username, email, password, birthday, role_id } = req.body;
    
    if (!username || !email || !role_id) {
      return res.status(400).json({ 
        success: false,
        message: 'Thiếu thông tin yêu cầu'
      });
    }

    try {
      const updatedUser = await userService.updateUser(userId, {
        username,
        email,
        password,
        birthday,
        role_id
      });

      res.json({ 
        success: true,
        message: `Đã cập nhật thông tin user ${username} thành công`,
        data: updatedUser
      });
    } catch (error) {
      console.error('Lỗi khi cập nhật user:', error);
      if (error.message === 'Không tìm thấy user') {
        res.status(404).json({ 
          success: false,
          message: 'Không tìm thấy user'
        });
      } else {
        res.status(500).json({ 
          success: false,
          message: 'Lỗi khi cập nhật thông tin user'
        });
      }
    }
  },

  // Xóa user
  deleteUser: async (req, res) => {
    const userId = req.params.id;

    try {
      await userService.deleteUser(userId);
      res.json({ 
        success: true,
        message: 'Đã xóa user thành công'
      });
    } catch (error) {
      console.error('Lỗi khi xóa user:', error);
      if (error.message === 'Không tìm thấy user') {
        res.status(404).json({ 
          success: false,
          message: 'Không tìm thấy user'
        });
      } else {
        res.status(500).json({ 
          success: false,
          message: 'Lỗi khi xóa user'
        });
      }
    }
  }
};

module.exports = userController; 