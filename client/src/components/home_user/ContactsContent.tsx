import React from 'react';

const ContactsContent: React.FC = () => {
  return (
    <div className="contacts-content">
      <div className="contacts-search-bar">
        <div className="search-icon"></div>
        <input 
          type="text" 
          placeholder="Tìm kiếm người dùng..." 
          className="contacts-search-input" 
        />
      </div>
      <div className="contacts-list">
        {/* Phần danh bạ sẽ được hiển thị ở đây */}
        <div className="contacts-empty">
          <div className="contacts-empty-icon"></div>
          <h3>Không có người dùng nào</h3>
          <p>Không tìm thấy người dùng nào trong danh bạ của bạn</p>
        </div>
      </div>
    </div>
  );
};

export default ContactsContent; 