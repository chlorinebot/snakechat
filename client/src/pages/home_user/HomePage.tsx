import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';
import api from '../../services/api';

interface UserProps {
  onLogout: () => void;
}

const HomePage: React.FC<UserProps> = ({ onLogout }) => {
  const [user, setUser] = useState<any>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState<boolean>(false);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Lấy thông tin người dùng từ localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        // Kiểm tra xem người dùng có role ID 2 không
        if (parsedUser.role_id !== 2) {
          // Nếu không phải role ID 2, điều hướng về trang đăng nhập
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        } else {
          setUser(parsedUser);
        }
      } catch (error) {
        console.error('Lỗi khi parse thông tin người dùng:', error);
        navigate('/login');
      }
    } else {
      navigate('/login');
    }

    // Handle click outside to close dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        avatarRef.current && 
        !dropdownRef.current.contains(event.target as Node) && 
        !avatarRef.current.contains(event.target as Node)
      ) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [navigate]);

  const handleLogoutClick = () => {
    onLogout();
    navigate('/login');
  };

  const toggleProfileDropdown = () => {
    console.log('Toggle dropdown:', !showProfileDropdown);
    setShowProfileDropdown(prevState => !prevState);
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Avatar clicked');
    toggleProfileDropdown();
  };

  if (!user) {
    return <div className="loading">Đang tải...</div>;
  }

  // Tạo chữ cái đầu của username để hiển thị làm avatar
  const userInitial = user.username ? user.username.charAt(0).toUpperCase() : '?';

  return (
    <div className="user-home-container">
      {/* Sidebar */}
      <div className="sidebar">
        {/* Avatar người dùng */}
        <div className="sidebar-top">
          <div 
            className="user-avatar" 
            ref={avatarRef}
            onClick={handleAvatarClick}
            style={{ cursor: 'pointer' }}
          >
            {userInitial}
          </div>
        </div>
        
        {/* Menu items */}
        <div className="sidebar-menu">
          <div className="sidebar-item active">
            <div className="sidebar-icon message-icon"></div>
            <div className="sidebar-tooltip">Tin nhắn</div>
          </div>
          <div className="sidebar-item">
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
      
      {/* Main content */}
      <div className="main-content">
        <div className="content-header">
          <h2>Tin nhắn</h2>
        </div>
        <div className="content-body">
          <div className="empty-state">
            <div className="empty-icon"></div>
            <h3>Không có tin nhắn nào</h3>
            <p>Bắt đầu cuộc trò chuyện bằng cách chọn một người dùng từ danh bạ</p>
          </div>
        </div>
      </div>

      {/* Dropdown khi click vào avatar - đặt ở mức root để không bị ảnh hưởng bởi stacking context của sidebar */}
      {showProfileDropdown && (
        <div 
          className="profile-dropdown show" 
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '10px',
            left: '80px',
            zIndex: 99999,
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '240px'
          }}
        >
          <div style={{ padding: '15px 20px', borderBottom: '1px solid #f5f5f5' }}>
            <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#888' }}>{user.username}</div>
          </div>
          <div style={{ padding: '8px 0' }}>
            <div style={{ padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#0084ff" style={{ marginRight: '8px' }}>
                  <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z"/>
                </svg>
                <span style={{ color: '#444' }}>Nâng cấp tài khoản</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#0084ff">
                <path d="M10 17l5-5-5-5v10z"></path>
              </svg>
            </div>
            <div style={{ padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#0084ff" style={{ marginRight: '8px' }}>
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              <span style={{ color: '#444' }}>Hồ sơ của bạn</span>
            </div>
            <div style={{ padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#0084ff" style={{ marginRight: '8px' }}>
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
              </svg>
              <span style={{ color: '#444' }}>Cài đặt</span>
            </div>
            <div style={{ height: '1px', backgroundColor: '#f5f5f5', margin: '5px 0' }}></div>
            <div style={{ padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={handleLogoutClick}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#0084ff" style={{ marginRight: '8px' }}>
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
              </svg>
              <span style={{ color: '#444' }}>Đăng xuất</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage; 