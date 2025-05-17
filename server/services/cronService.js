const userController = require('../controllers/userController');

// Server side CRON job để tự động cập nhật trạng thái người dùng không hoạt động
const setupInactiveUsersCron = () => {
  // Chạy mỗi 1 phút để kiểm tra người dùng không hoạt động
  setInterval(async () => {
    try {
      // Gọi controller kiểm tra người dùng không hoạt động
      const req = {
        ip: '127.0.0.1',
        body: { threshold: 3 }, // Người dùng không hoạt động quá 3 phút
        headers: {}
      };
      
      const res = {
        json: (data) => {
          if (data.affected > 0) {
            console.log(`Cập nhật trạng thái offline cho ${data.affected} người dùng không hoạt động`);
          }
        },
        status: (code) => {
          return {
            json: (data) => {
              console.error('Lỗi khi kiểm tra người dùng không hoạt động:', data);
            }
          };
        }
      };
      
      await userController.checkInactiveUsers(req, res);
    } catch (error) {
      console.error('Lỗi khi kiểm tra người dùng không hoạt động:', error);
    }
  }, 60 * 1000); // 1 phút
};

module.exports = {
  setupInactiveUsersCron
}; 