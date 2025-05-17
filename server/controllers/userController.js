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
  },

  // Khóa tài khoản user
  lockUser: async (req, res) => {
    const { user_id, reason, lock_time, unlock_time } = req.body;
    
    if (!user_id || !reason || !lock_time || !unlock_time) {
      return res.status(400).json({ 
        success: false,
        message: 'Thiếu thông tin yêu cầu'
      });
    }

    try {
      const result = await userService.lockUser({
        user_id,
        reason,
        lock_time,
        unlock_time,
        status: 'locked'
      });

      res.json({ 
        success: true,
        message: `Đã khóa tài khoản thành công`,
        data: result
      });
    } catch (error) {
      console.error('Lỗi khi khóa tài khoản:', error);
      if (error.message === 'Không tìm thấy user') {
        res.status(404).json({ 
          success: false,
          message: 'Không tìm thấy tài khoản'
        });
      } else {
        res.status(500).json({ 
          success: false,
          message: 'Lỗi khi khóa tài khoản'
        });
      }
    }
  },

  // Mở khóa tài khoản user
  unlockUser: async (req, res) => {
    const userId = req.params.id;

    try {
      const result = await userService.unlockUser(userId);

      res.json({ 
        success: true,
        message: `Đã mở khóa tài khoản thành công`,
        data: result
      });
    } catch (error) {
      console.error('Lỗi khi mở khóa tài khoản:', error);
      if (error.message === 'Không tìm thấy user') {
        res.status(404).json({ 
          success: false,
          message: 'Không tìm thấy tài khoản'
        });
      } else if (error.message === 'Tài khoản không bị khóa') {
        res.status(400).json({ 
          success: false,
          message: 'Tài khoản không ở trạng thái khóa'
        });
      } else {
        res.status(500).json({ 
          success: false,
          message: 'Lỗi khi mở khóa tài khoản'
        });
      }
    }
  },

  // Cập nhật trạng thái người dùng (online/offline)
  updateUserStatus: async (req, res) => {
    const { user_id, status } = req.body;

    if (!user_id || !status) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin user_id hoặc status'
      });
    }

    try {
      const result = await userService.updateUserStatus(user_id, status);
      
      // Cập nhật thời gian hoạt động cuối cùng nếu đang online
      if (status === 'online') {
        await userService.updateLastActivityTime(user_id);
      }
      
      res.json({
        success: true,
        message: `Đã cập nhật trạng thái user thành ${status}`,
        data: result
      });
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái user:', error);
      if (error.message === 'Không tìm thấy user') {
        res.status(404).json({
          success: false,
          message: 'Không tìm thấy user'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Lỗi khi cập nhật trạng thái user'
        });
      }
    }
  },

  // Nhận heartbeat từ client và cập nhật thời gian hoạt động
  receiveUserHeartbeat: async (req, res) => {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin user_id'
      });
    }

    try {
      // Cập nhật thời gian hoạt động cuối cùng của người dùng
      const result = await userService.updateLastActivityTime(user_id);
      
      // Kiểm tra trạng thái hiện tại của người dùng
      const user = await userService.getUserById(user_id);
      
      // Nếu người dùng đang ở trạng thái away, cập nhật lại thành online
      if (user && user.status === 'away') {
        await userService.updateUserStatus(user_id, 'online');
      }
      
      res.json({
        success: true,
        message: 'Đã cập nhật heartbeat thành công',
        data: result
      });
    } catch (error) {
      console.error('Lỗi khi xử lý heartbeat:', error);
      if (error.message === 'Không tìm thấy user') {
        res.status(404).json({
          success: false,
          message: 'Không tìm thấy user'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Lỗi khi xử lý heartbeat'
        });
      }
    }
  },

  // Xử lý yêu cầu cập nhật trạng thái offline từ Beacon API
  updateUserStatusBeacon: async (req, res) => {
    // Beacon API không chờ phản hồi, nên trả về ngay lập tức
    res.status(202).send('');
    
    // Lấy dữ liệu từ form data (Beacon API sử dụng FormData)
    const user_id = req.body.user_id;
    const status = req.body.status || 'offline';
    
    if (!user_id) {
      console.error('Thiếu thông tin user_id trong yêu cầu Beacon');
      return;
    }
    
    try {
      // Cập nhật trạng thái offline
      await userService.updateUserStatus(user_id, status);
    } catch (error) {
      console.error('Lỗi khi xử lý yêu cầu Beacon:', error);
    }
  },
  
  // Kiểm tra và cập nhật người dùng không hoạt động
  checkInactiveUsers: async (req, res) => {
    try {
      // Chỉ cho phép request từ server local hoặc có API key hợp lệ
      const apiKey = req.headers['x-api-key'] || '';
      if (req.ip !== '127.0.0.1' && req.ip !== '::1' && apiKey !== process.env.INTERNAL_API_KEY) {
        return res.status(403).json({
          success: false,
          message: 'Không có quyền truy cập'
        });
      }
      
      // Lấy thời gian không hoạt động tối đa (mặc định 5 phút)
      const inactiveThreshold = parseInt(req.body.threshold || 5, 10);
      
      // Gọi service để cập nhật trạng thái người dùng không hoạt động
      const result = await userService.updateInactiveUsers(inactiveThreshold);
      
      // Kiểm tra và cập nhật trạng thái những người dùng away quá lâu
      const awayResult = await userService.updateAwayUsers(inactiveThreshold * 2); // Gấp đôi thời gian inactive
      
      res.json({
        success: true,
        message: 'Đã kiểm tra và cập nhật người dùng không hoạt động',
        affected: result.affected + awayResult.affected,
        users: [...result.users, ...awayResult.users]
      });
    } catch (error) {
      console.error('Lỗi khi kiểm tra người dùng không hoạt động:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi kiểm tra người dùng không hoạt động'
      });
    }
  },

  // Lấy lịch sử khóa tài khoản 
  getLockHistory: async (req, res) => {
    try {
      const lockHistory = await userService.getLockHistory();
      res.json({ 
        success: true,
        message: 'Lấy lịch sử khóa tài khoản thành công',
        items: lockHistory 
      });
    } catch (error) {
      console.error('Lỗi khi lấy lịch sử khóa tài khoản:', error);
      res.status(500).json({ 
        success: false,
        message: 'Lỗi khi lấy dữ liệu từ server'
      });
    }
  }
};

module.exports = userController;  