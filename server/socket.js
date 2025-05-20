const socketIo = require('socket.io');
const db = require('./db');

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
      
      // Lắng nghe sự kiện tin nhắn đã đọc
      socket.on('message_read', async (data) => {
        console.log(`Nhận thông báo tin nhắn đã đọc:`, data);
        
        if (data.conversation_id && data.reader_id) {
          try {
            // Tìm người gửi tin nhắn trong cuộc trò chuyện để gửi thông báo
            const [senders] = await db.query(`
              SELECT DISTINCT m.sender_id 
              FROM messages m
              JOIN conversation_members cm ON m.conversation_id = cm.conversation_id
              WHERE m.conversation_id = ? 
              AND m.sender_id != ? 
              AND cm.user_id = m.sender_id
              AND cm.left_at IS NULL
            `, [data.conversation_id, data.reader_id]);
            
            // Gửi thông báo đến từng người gửi riêng biệt
            if (senders && senders.length > 0) {
              console.log(`Gửi thông báo đã đọc đến ${senders.length} người gửi`);
              
              for (const sender of senders) {
                // Nếu có danh sách message_ids, truyền trực tiếp
                if (data.message_ids && Array.isArray(data.message_ids)) {
                  // Lọc các tin nhắn thuộc về người gửi cụ thể này
                  const [senderMessages] = await db.query(`
                    SELECT message_id FROM messages 
                    WHERE conversation_id = ? 
                    AND sender_id = ? 
                    AND message_id IN (?)
                  `, [data.conversation_id, sender.sender_id, data.message_ids]);
                  
                  if (senderMessages && senderMessages.length > 0) {
                    sendNotificationToUser(parseInt(sender.sender_id), 'message_read_receipt', {
                      conversation_id: data.conversation_id,
                      reader_id: data.reader_id,
                      message_ids: senderMessages.map(msg => msg.message_id),
                      read_at: new Date().toISOString()
                    });
                  }
                } else {
                  // Gửi thông báo với thời gian đọc để client có thể xử lý
                  sendNotificationToUser(parseInt(sender.sender_id), 'message_read_receipt', {
                    conversation_id: data.conversation_id,
                    reader_id: data.reader_id,
                    read_at: new Date().toISOString()
                  });
                }
              }
            }
          } catch (error) {
            console.error('Lỗi khi xử lý thông báo tin nhắn đã đọc:', error);
          }
        }
      });
      
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

// Gửi thông báo cập nhật số tin nhắn chưa đọc và danh sách cuộc trò chuyện
const sendUnreadCountUpdate = async (userId) => {
  try {
    // Lấy tổng số tin nhắn chưa đọc
    const [unreadCountResult] = await db.query(`
      SELECT COUNT(*) as total_unread
      FROM messages m
      JOIN conversation_members cm ON m.conversation_id = cm.conversation_id
      WHERE cm.user_id = ? AND m.sender_id != ? AND m.is_read = 0 AND cm.left_at IS NULL
    `, [userId, userId]);

    const totalUnread = unreadCountResult[0]?.total_unread || 0;

    // Lấy thông tin các cuộc trò chuyện có tin nhắn mới
    const [conversations] = await db.query(`
      SELECT c.conversation_id, c.conversation_name, c.conversation_type,
             c.created_at, c.updated_at, 
             (SELECT COUNT(*) FROM messages m 
              WHERE m.conversation_id = c.conversation_id 
              AND m.sender_id != ? AND m.is_read = 0) as unread_count,
             (SELECT m.message_id FROM messages m 
              WHERE m.conversation_id = c.conversation_id 
              ORDER BY m.created_at DESC LIMIT 1) as last_message_id,
             (SELECT m.content FROM messages m 
              WHERE m.conversation_id = c.conversation_id 
              ORDER BY m.created_at DESC LIMIT 1) as last_message_content,
             (SELECT m.created_at FROM messages m 
              WHERE m.conversation_id = c.conversation_id 
              ORDER BY m.created_at DESC LIMIT 1) as last_message_time
      FROM conversations c
      JOIN conversation_members cm ON c.conversation_id = cm.conversation_id
      LEFT JOIN messages m ON c.conversation_id = m.conversation_id
      WHERE cm.user_id = ? AND cm.left_at IS NULL
      GROUP BY c.conversation_id
      ORDER BY c.updated_at DESC
    `, [userId, userId]);

    // Thông báo cho người dùng cập nhật số lượng tin nhắn chưa đọc và danh sách cuộc trò chuyện
    sendNotificationToUser(parseInt(userId), 'unread_count_update', {
      user_id: userId,
      total_unread: totalUnread,
      conversations: conversations,
      timestamp: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error(`Lỗi khi gửi thông báo cập nhật tin nhắn chưa đọc đến người dùng ${userId}:`, error);
    return false;
  }
};

module.exports = {
  setupSocket,
  sendNotificationToUser,
  sendUnreadCountUpdate
}; 