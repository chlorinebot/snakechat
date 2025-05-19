import React, { useState } from 'react';

type ContactTab = 'friends' | 'requests' | 'explore';

interface ContactsSidebarProps {
  activeTab?: ContactTab; // Tab hiện tại đang được chọn
  onTabChange?: (tab: ContactTab) => void;
  friendRequestCount?: number; // Số lượng lời mời kết bạn
}

const ContactsSidebar: React.FC<ContactsSidebarProps> = ({ activeTab, onTabChange, friendRequestCount = 0 }) => {
  const [internalActiveTab, setInternalActiveTab] = useState<ContactTab>(activeTab || 'friends');

  const handleTabChange = (tab: ContactTab) => {
    setInternalActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };
  
  // Sử dụng activeTab từ prop nếu có, nếu không sử dụng state nội bộ
  const currentTab = activeTab || internalActiveTab;

  // Hiển thị badge chỉ khi có ít nhất 1 lời mời kết bạn
  const showBadge = friendRequestCount > 0;
  // Hiển thị số +9 nếu có hơn 9 lời mời kết bạn
  const badgeText = friendRequestCount > 9 ? '+9' : friendRequestCount.toString();

  return (
    <div className="contacts-sidebar">
      {/* Sidebar cho danh sách nhóm danh bạ */}
      <div className="contacts-sidebar-header">
        <h3 style={{ color: '#000' }}>Tất cả danh bạ</h3>
      </div>
      <div className="contacts-sidebar-content">
        <div 
          className={`contact-sidebar-item ${currentTab === 'friends' ? 'active' : ''}`}
          onClick={() => handleTabChange('friends')}
        >
          <div className="contact-sidebar-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={currentTab === 'friends' ? "#0084ff" : "#777"}>
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <span style={{ color: currentTab === 'friends' ? '#0084ff' : '#000' }}>Danh sách bạn bè</span>
        </div>
        <div 
          className={`contact-sidebar-item ${currentTab === 'requests' ? 'active' : ''}`}
          onClick={() => handleTabChange('requests')}
          style={{ position: 'relative' }}
        >
          <div className="contact-sidebar-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={currentTab === 'requests' ? "#0084ff" : "#777"}>
              <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <span style={{ color: currentTab === 'requests' ? '#0084ff' : '#000' }}>Lời mời kết bạn</span>
          
          {/* Hiển thị badge khi có lời mời kết bạn */}
          {showBadge && (
            <div className="friend-request-badge-sidebar">
              {badgeText}
            </div>
          )}
        </div>
        <div 
          className={`contact-sidebar-item ${currentTab === 'explore' ? 'active' : ''}`}
          onClick={() => handleTabChange('explore')}
        >
          <div className="contact-sidebar-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={currentTab === 'explore' ? "#0084ff" : "#777"}>
              <path d="M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z"/>
            </svg>
          </div>
          <span style={{ color: currentTab === 'explore' ? '#0084ff' : '#000' }}>Khám phá</span>
        </div>
      </div>
    </div>
  );
};

export default ContactsSidebar; 