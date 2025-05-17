import React, { useState, useEffect } from 'react';

interface ContactsContentProps {
  activeTab?: 'friends' | 'requests';
}

const ContactsContent: React.FC<ContactsContentProps> = ({ activeTab = 'friends' }) => {
  return (
    <div className="contacts-content">
      <div className="contacts-search-bar">
        <div className="search-icon"></div>
        <input 
          type="text" 
          placeholder={`Tìm kiếm ${activeTab === 'friends' ? 'bạn bè' : 'lời mời kết bạn'}...`} 
          className="contacts-search-input" 
        />
      </div>
      <div className="contacts-list">
        {activeTab === 'friends' ? (
          <div className="contacts-empty">
            <div className="contacts-empty-icon"></div>
            <h3>Không có bạn bè nào</h3>
            <p>Danh sách bạn bè của bạn đang trống</p>
          </div>
        ) : (
          <div className="contacts-empty">
            <div className="contacts-empty-icon friend-request-icon"></div>
            <h3>Không có lời mời kết bạn</h3>
            <p>Bạn không có lời mời kết bạn nào</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactsContent; 