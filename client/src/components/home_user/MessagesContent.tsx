import React from 'react';

const MessagesContent: React.FC = () => {
  return (
    <div className="messages-content">
      <div className="empty-state">
        <div className="empty-icon"></div>
        <h3>Không có tin nhắn nào</h3>
        <p>Bắt đầu cuộc trò chuyện bằng cách chọn một người dùng từ danh bạ</p>
      </div>
    </div>
  );
};

export default MessagesContent; 