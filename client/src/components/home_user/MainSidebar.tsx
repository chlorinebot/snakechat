import React from 'react';

type ActiveTab = 'messages' | 'contacts';

interface MainSidebarProps {
  activeTab: ActiveTab;
  userInitial: string;
  onTabChange: (tab: ActiveTab) => void;
  onAvatarClick: (e: React.MouseEvent) => void;
  avatarRef: React.RefObject<HTMLDivElement | null>;
}

const MainSidebar: React.FC<MainSidebarProps> = ({ 
  activeTab, 
  userInitial, 
  onTabChange, 
  onAvatarClick,
  avatarRef
}) => {
  return (
    <div className="sidebar">
      {/* Avatar người dùng */}
      <div className="sidebar-top">
        <div 
          className="user-avatar" 
          ref={avatarRef}
          onClick={onAvatarClick}
          style={{ cursor: 'pointer' }}
        >
          {userInitial}
        </div>
      </div>
      
      {/* Menu items */}
      <div className="sidebar-menu">
        <div 
          className={`sidebar-item ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => onTabChange('messages')}
        >
          <div className="sidebar-icon message-icon"></div>
          <div className="sidebar-tooltip">Tin nhắn</div>
        </div>
        <div 
          className={`sidebar-item ${activeTab === 'contacts' ? 'active' : ''}`}
          onClick={() => onTabChange('contacts')}
        >
          <div className="sidebar-icon contacts-icon"></div>
          <div className="sidebar-tooltip">Danh bạ</div>
        </div>
      </div>
      
      {/* Bottom items */}
      <div className="sidebar-bottom">
        <div className="sidebar-item">
          <div className="sidebar-icon settings-icon"></div>
          <div className="sidebar-tooltip">Cài đặt</div>
        </div>
      </div>
    </div>
  );
};

export default MainSidebar; 