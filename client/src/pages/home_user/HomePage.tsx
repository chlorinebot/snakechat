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
import SettingsModal from '../../components/home_user/SettingsModal';
import ProfileModal from '../../components/home_user/ProfileModal';

interface UserProps {
  onLogout: () => void;
}

type ActiveTab = 'messages' | 'contacts';
type ContactTab = 'friends' | 'requests' | 'explore';

const HomePage: React.FC<UserProps> = ({ onLogout }) => {
  const [user, setUser] = useState<any>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('messages');
  const [contactsTab, setContactsTab] = useState<ContactTab>('friends');
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
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

  const handleSettingsClick = () => {
    setShowSettingsModal(true);
    setShowProfileDropdown(false);
  };

  const handleProfileClick = () => {
    setShowProfileModal(true);
    setShowProfileDropdown(false);
  };

  if (!user) {
    return <div className="loading">Đang tải...</div>;
  }

  const getContactsHeaderTitle = () => {
    switch (contactsTab) {
      case 'friends':
        return 'Danh sách bạn bè';
      case 'requests':
        return 'Lời mời kết bạn';
      case 'explore':
        return 'Khám phá người dùng';
      default:
        return 'Danh bạ';
    }
  };

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
        onSettingsClick={handleSettingsClick}
      />
      
      {/* Main content */}
      <div className="main-content">
        {activeTab === 'messages' ? (
          <div className="messages-container">
            <div className="content-header">
              <h2>Tin nhắn</h2>
            </div>
            <MessagesSidebar />
            <MessagesContent />
          </div>
        ) : (
          <div className="contacts-container">
            <div className="content-header">
              <h2>{getContactsHeaderTitle()}</h2>
            </div>
            <ContactsSidebar onTabChange={handleContactsTabChange} />
            <ContactsContent activeTab={contactsTab} />
          </div>
        )}
      </div>

      {/* Dropdown khi click vào avatar */}
      {showProfileDropdown && (
        <UserDropdown 
          username={user.username}
          dropdownRef={dropdownRef}
          onLogout={handleLogoutClick}
          onProfileClick={handleProfileClick}
          onSettingsClick={handleSettingsClick}
        />
      )}

      {/* Modal cài đặt */}
      <SettingsModal 
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      {/* Modal hồ sơ người dùng */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  );
};

export default HomePage; 