const db = require('../db');
const socketService = require('../socket');

// Lấy tất cả tin nhắn trong một cuộc trò chuyện
exports.getConversationMessages = async (req, res) => {
  const conversationId = parseInt(req.params.conversationId);
  
  if (!conversationId) {
    return res.status(400).json({ error: 'Thiếu ID cuộc trò chuyện' });
  }
  
  try {
    // Lấy tin nhắn từ database với thông tin người gửi
    const [messages] = await db.query(`
      SELECT m.message_id, m.conversation_id, m.sender_id, 
             u.username as sender_name, m.content, 
             m.message_type, m.created_at, m.is_read
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.user_id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC
    `, [conversationId]);
    
    return res.status(200).json({ items: messages });
    
  } catch (error) {
    console.error('Lỗi khi lấy tin nhắn:', error);
    return res.status(500).json({ error: 'Lỗi server khi lấy tin nhắn' });
  }
};

// Gửi tin nhắn mới
exports.sendMessage = async (req, res) => {
  const { conversation_id, sender_id, content, message_type = 'text' } = req.body;
  
  if (!conversation_id || !sender_id || !content) {
    return res.status(400).json({ error: 'Thiếu thông tin tin nhắn' });
  }
  
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Thêm tin nhắn vào database
    const [messageResult] = await connection.query(`
      INSERT INTO messages (conversation_id, sender_id, content, message_type, created_at, is_read)
      VALUES (?, ?, ?, ?, NOW(), 0)
    `, [conversation_id, sender_id, content, message_type]);
    
    const messageId = messageResult.insertId;
    
    // Cập nhật thời gian cuộc trò chuyện
    await connection.query(`
      UPDATE conversations
      SET updated_at = NOW()
      WHERE conversation_id = ?
    `, [conversation_id]);
    
    await connection.commit();
    
    // Lấy thông tin người gửi
    const [senderResults] = await db.query(`
      SELECT username FROM users WHERE user_id = ?
    `, [sender_id]);
    
    const senderName = senderResults.length > 0 ? senderResults[0].username : null;
    
    // Lấy thông tin chi tiết tin nhắn vừa gửi
    const [messageDetails] = await db.query(`
      SELECT message_id, conversation_id, sender_id, content, 
             message_type, created_at, is_read
      FROM messages
      WHERE message_id = ?
    `, [messageId]);
    
    const message = {
      ...messageDetails[0],
      sender_name: senderName
    };
    
    // Lấy danh sách thành viên trong cuộc trò chuyện để gửi thông báo
    const [members] = await db.query(`
      SELECT user_id
      FROM conversation_members
      WHERE conversation_id = ? AND left_at IS NULL AND user_id != ?
    `, [conversation_id, sender_id]);
    
    // Gửi thông báo tin nhắn mới qua socket
    members.forEach(member => {
      // Gửi nội dung tin nhắn
      socketService.sendNotificationToUser(member.user_id, 'new_message', message);
      
      // Gửi thông báo cập nhật số tin nhắn chưa đọc
      socketService.sendUnreadCountUpdate(member.user_id);
    });
    
    return res.status(201).json({
      success: true,
      message: 'Gửi tin nhắn thành công',
      data: message
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Lỗi khi gửi tin nhắn:', error);
    return res.status(500).json({ error: 'Lỗi server khi gửi tin nhắn' });
  } finally {
    connection.release();
  }
};

// Đánh dấu một tin nhắn đã đọc
exports.markMessageAsRead = async (req, res) => {
  const messageId = parseInt(req.params.messageId);
  
  if (!messageId) {
    return res.status(400).json({ error: 'Thiếu ID tin nhắn' });
  }
  
  try {
    // Cập nhật trạng thái đã đọc cho tin nhắn
    await db.query(`
      UPDATE messages
      SET is_read = 1
      WHERE message_id = ?
    `, [messageId]);
    
    return res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('Lỗi khi đánh dấu tin nhắn đã đọc:', error);
    return res.status(500).json({ error: 'Lỗi server khi đánh dấu tin nhắn đã đọc' });
  }
};

// Đánh dấu tất cả tin nhắn trong cuộc trò chuyện là đã đọc
exports.markAllMessagesAsRead = async (req, res) => {
  const { conversation_id, user_id } = req.body;
  
  if (!conversation_id || !user_id) {
    return res.status(400).json({ error: 'Thiếu thông tin cần thiết' });
  }
  
  try {
    // Đánh dấu tất cả tin nhắn trong cuộc trò chuyện là đã đọc, trừ tin nhắn của chính mình
    await db.query(`
      UPDATE messages
      SET is_read = 1
      WHERE conversation_id = ? AND sender_id != ? AND is_read = 0
    `, [conversation_id, user_id]);
    
    // Lấy thông tin người gửi cuộc trò chuyện để gửi thông báo cập nhật
    const [senders] = await db.query(`
      SELECT DISTINCT sender_id
      FROM messages
      WHERE conversation_id = ? AND sender_id != ?
    `, [conversation_id, user_id]);
    
    // Gửi thông báo cập nhật số tin nhắn chưa đọc cho cả người đọc và người gửi
    socketService.sendUnreadCountUpdate(parseInt(user_id));
    
    // Gửi thông báo cho các người gửi biết tin nhắn của họ đã được đọc
    senders.forEach(sender => {
      if (sender.sender_id) {
        socketService.sendNotificationToUser(sender.sender_id, 'message_read_receipt', {
          conversation_id: conversation_id,
          reader_id: user_id,
          read_at: new Date().toISOString()
        });
      }
    });
    
    return res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('Lỗi khi đánh dấu tất cả tin nhắn đã đọc:', error);
    return res.status(500).json({ error: 'Lỗi server khi đánh dấu tất cả tin nhắn đã đọc' });
  }
}; 