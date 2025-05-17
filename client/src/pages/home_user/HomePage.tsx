import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';
import api from '../../services/api';

// Import các components
import MainSidebar from '../../components/home_user/MainSidebar';
import UserDropdown from '../../components/home_user/UserDropdown';
import MessagesSidebar from '../../components/home_user/MessagesSidebar';
import MessagesContent from '../../components/home_user/MessagesContent';
import ContactsSidebar from '../../components/home_user/ContactsSidebar';
import ContactsContent from '../../components/home_user/ContactsContent';

interface UserProps {
  onLogout: () => void;
}

type ActiveTab = 'messages' | 'contacts';
type ContactTab = 'friends' | 'requests';

const HomePage: React.FC<UserProps> = ({ onLogout }) => {
  const [user, setUser] = useState<any>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('messages');
  const [contactsTab, setContactsTab] = useState<ContactTab>('friends');
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

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setShowProfileDropdown(false);
  };

  const handleContactsTabChange = (tab: ContactTab) => {
    setContactsTab(tab);
  };

  if (!user) {
    return <div className="loading">Đang tải...</div>;
  }

  // Tạo chữ cái đầu của username để hiển thị làm avatar
  const userInitial = user.username ? user.username.charAt(0).toUpperCase() : '?';

  return (
    <div className="user-home-container">
      {/* Sidebar chính */}
      <MainSidebar 
        activeTab={activeTab} 
        userInitial={userInitial} 
        onTabChange={handleTabChange} 
        onAvatarClick={handleAvatarClick}
        avatarRef={avatarRef}
      />
      
      {/* Main content */}
      <div className="main-content">
        <div className="content-header">
          <h2>{activeTab === 'messages' ? 'Tin nhắn' : contactsTab === 'friends' ? 'Danh sách bạn bè' : 'Lời mời kết bạn'}</h2>
        </div>
        <div className="content-body">
          {activeTab === 'messages' ? (
            <div className="messages-container">
              <MessagesSidebar />
              <MessagesContent />
            </div>
          ) : (
            <div className="contacts-container">
              <ContactsSidebar onTabChange={handleContactsTabChange} />
              <ContactsContent activeTab={contactsTab} />
            </div>
          )}
        </div>
      </div>

      {/* Dropdown khi click vào avatar */}
      {showProfileDropdown && (
        <UserDropdown 
          username={user.username}
          dropdownRef={dropdownRef}
          onLogout={handleLogoutClick}
        />
      )}
    </div>
  );
};

export default HomePage; 