const socketIo = require('socket.io');

// Lưu trữ các kết nối socket theo user ID
const userSockets = new Map();

const setupSocket = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: '*', // Trong môi trường production, hãy giới hạn nguồn gốc cụ thể
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    
    if (userId) {
      console.log(`Người dùng ${userId} đã kết nối`);
      
      // Lưu socket theo user ID
      userSockets.set(parseInt(userId), socket);
      
      // Xử lý ngắt kết nối
      socket.on('disconnect', () => {
        console.log(`Người dùng ${userId} đã ngắt kết nối`);
        userSockets.delete(parseInt(userId));
      });
    }
  });

  return io;
};

// Gửi thông báo đến người dùng cụ thể
const sendNotificationToUser = (userId, eventName, data) => {
  const userSocket = userSockets.get(userId);
  
  if (userSocket) {
    userSocket.emit(eventName, data);
    console.log(`Đã gửi thông báo ${eventName} đến người dùng ${userId}:`, data);
    return true;
  }
  
  console.log(`Không thể gửi thông báo đến người dùng ${userId}: Không tìm thấy kết nối socket`);
  return false;
};

module.exports = {
  setupSocket,
  sendNotificationToUser
}; 