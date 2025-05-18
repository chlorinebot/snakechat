import React from 'react';

type ActiveTab = 'messages' | 'contacts';

interface MainSidebarProps {
  activeTab: ActiveTab;
  userInitial: string;
  onTabChange: (tab: ActiveTab) => void;
  onAvatarClick: (e: React.MouseEvent) => void;
  avatarRef: React.RefObject<HTMLDivElement | null>;
  onSettingsClick: () => void;
  friendRequestCount?: number; // Số lượng lời mời kết bạn
}

const MainSidebar: React.FC<MainSidebarProps> = ({ 
  activeTab, 
  userInitial, 
  onTabChange, 
  onAvatarClick,
  avatarRef,
  onSettingsClick,
  friendRequestCount = 0
}) => {
  // Hiển thị badge chỉ khi có ít nhất 1 lời mời kết bạn
  const showBadge = friendRequestCount > 0;
  // Hiển thị số +9 nếu có hơn 9 lời mời kết bạn
  const badgeText = friendRequestCount > 9 ? '+9' : friendRequestCount.toString();

  return (
    <div className="sidebar">
      {/* Avatar người dùng */}
      <div className="sidebar-top">
        <div 
          className="user-avatar" 
          ref={avatarRef}
          onClick={onAvatarClick}
          style={{ 
            cursor: 'pointer',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease',
            backgroundColor: '#0084ff'
          }}
          title="Nhấp để mở menu cài đặt"
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
          style={{ position: 'relative' }}
        >
          <div className="sidebar-icon contacts-icon"></div>
          <div className="sidebar-tooltip">Danh bạ</div>
          
          {/* Hiển thị badge khi có lời mời kết bạn */}
          {showBadge && (
            <div className="friend-request-badge">
              {badgeText}
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom items */}
      <div className="sidebar-bottom">
        <div className="sidebar-item" onClick={onSettingsClick}>
          <div className="sidebar-icon settings-icon"></div>
          <div className="sidebar-tooltip">Cài đặt</div>
        </div>
      </div>
    </div>
  );
};

export default MainSidebar; 