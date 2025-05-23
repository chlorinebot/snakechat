import React from 'react';

interface UserDropdownProps {
  username: string;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  onLogout: () => void;
  onProfileClick: () => void;
  onSettingsClick: () => void;
  onUpdateLastActivity?: () => void;
}

const UserDropdown: React.FC<UserDropdownProps> = ({ 
  username, 
  dropdownRef, 
  onLogout, 
  onProfileClick,
  onSettingsClick,
  onUpdateLastActivity
}) => {
  return (
    <div 
      className="profile-dropdown show" 
      ref={dropdownRef}
      style={{
        position: 'absolute',
        top: '70px',
        left: '15px',
        zIndex: 99999,
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        backgroundColor: 'white',
        borderRadius: '8px',
        width: '240px'
      }}
    >
      <div style={{ padding: '15px 20px', borderBottom: '1px solid #f5f5f5' }}>
        <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#444' }}>{username}</div>
      </div>
      <div style={{ padding: '8px 0' }}>
        <div 
          style={{ padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          onClick={onProfileClick}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#0084ff" style={{ marginRight: '8px' }}>
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          <span style={{ color: '#444' }}>Hồ sơ của bạn</span>
        </div>
        <div 
          style={{ padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          onClick={onSettingsClick}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#0084ff" style={{ marginRight: '8px' }}>
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
          <span style={{ color: '#444' }}>Cài đặt</span>
        </div>
        {onUpdateLastActivity && (
          <div 
            style={{ padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            onClick={onUpdateLastActivity}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#0084ff" style={{ marginRight: '8px' }}>
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 9h7V2l-2.35 4.35z"/>
            </svg>
            <span style={{ color: '#444' }}>Cập nhật thời gian hoạt động</span>
          </div>
        )}
        <div style={{ height: '1px', backgroundColor: '#f5f5f5', margin: '5px 0' }}></div>
        <div 
          style={{ padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} 
          onClick={onLogout}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#0084ff" style={{ marginRight: '8px' }}>
            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
          </svg>
          <span style={{ color: '#444' }}>Đăng xuất</span>
        </div>
      </div>
    </div>
  );
};

export default UserDropdown; 