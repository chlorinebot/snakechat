import React, { useState } from 'react';

type ContactTab = 'friends' | 'requests';

interface ContactsSidebarProps {
  onTabChange?: (tab: ContactTab) => void;
}

const ContactsSidebar: React.FC<ContactsSidebarProps> = ({ onTabChange }) => {
  const [activeTab, setActiveTab] = useState<ContactTab>('friends');

  const handleTabChange = (tab: ContactTab) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  return (
    <div className="contacts-sidebar">
      {/* Sidebar cho danh sách nhóm danh bạ */}
      <div className="contacts-sidebar-header">
        <h3 style={{ color: '#000' }}>Tất cả danh bạ</h3>
      </div>
      <div className="contacts-sidebar-content">
        <div 
          className={`contact-sidebar-item ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => handleTabChange('friends')}
        >
          <div className="contact-sidebar-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={activeTab === 'friends' ? "#0084ff" : "#777"}>
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <span style={{ color: activeTab === 'friends' ? '#0084ff' : '#000' }}>Danh sách bạn bè</span>
        </div>
        <div 
          className={`contact-sidebar-item ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => handleTabChange('requests')}
        >
          <div className="contact-sidebar-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={activeTab === 'requests' ? "#0084ff" : "#777"}>
              <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <span style={{ color: activeTab === 'requests' ? '#0084ff' : '#000' }}>Lời mời kết bạn</span>
        </div>
      </div>
    </div>
  );
};

export default ContactsSidebar; 