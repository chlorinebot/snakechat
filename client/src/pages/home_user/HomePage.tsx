import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';
import api from '../../services/api';
import socketService from '../../services/socketService';

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
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('user') || '{}'));
  const [showProfileDropdown, setShowProfileDropdown] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('messages');
  const [contactsTab, setContactsTab] = useState<ContactTab>('friends');
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [friendRequestCount, setFriendRequestCount] = useState<number>(0);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const avatarRef = useRef<HTMLDivElement | null>(null);
  
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
          
          // Kết nối socket khi xác định user
          socketService.connect(parsedUser.user_id);
          
          // Lắng nghe sự kiện cập nhật số lượng lời mời kết bạn
          socketService.on('friend_request', (data) => {
            console.log('Nhận lời mời kết bạn mới:', data);
            setFriendRequestCount(data.count);
          });
          
          socketService.on('friend_request_count_update', (data) => {
            console.log('Cập nhật số lượng lời mời kết bạn:', data);
            setFriendRequestCount(data.count);
          });
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
    
    // Cleanup khi component unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      socketService.disconnect();
      socketService.off('friend_request');
      socketService.off('friend_request_count_update');
    };
  }, [navigate]);

  useEffect(() => {
    // Lấy số lượng lời mời kết bạn khi component mount
    const fetchFriendRequests = async () => {
      if (user && user.user_id) {
        try {
          const requests = await api.getReceivedFriendRequests(user.user_id);
          if (requests && Array.isArray(requests)) {
            setFriendRequestCount(requests.length);
            console.log(`Đã cập nhật số lượng lời mời kết bạn: ${requests.length}`);
          }
        } catch (error) {
          console.error('Lỗi khi lấy số lượng lời mời kết bạn:', error);
        }
      }
    };

    // Gọi lần đầu khi component mount
    fetchFriendRequests();
  }, [user]);

  // Kiểm tra trạng thái khóa tài khoản khi trang được tải
  useEffect(() => {
    const checkAccountStatus = async () => {
      const userJson = localStorage.getItem('user');
      if (userJson) {
        try {
          const user = JSON.parse(userJson);
          const userId = user.user_id || user.id;
          
          if (userId) {
            const lockStatus = await api.checkAccountLockStatus(userId);
            
            if (lockStatus.isLocked && lockStatus.lockInfo) {
              console.log('Tài khoản bị khóa:', lockStatus.lockInfo);
              
              // Điều hướng về trang đăng nhập với thông tin khóa tài khoản
              navigate('/login', {
                state: {
                  isLocked: true,
                  lockInfo: {
                    ...lockStatus.lockInfo,
                    username: user.username,
                    email: user.email
                  }
                }
              });
            }
          }
        } catch (error) {
          console.error('Lỗi khi kiểm tra trạng thái tài khoản:', error);
        }
      }
    };
    
    checkAccountStatus();
  }, [navigate]);

  const handleLogoutClick = () => {
    socketService.disconnect();
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
    // Không đóng dropdown khi chuyển tab
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

  const handleUpdateLastActivity = async () => {
    try {
      const result = await api.updateLastActivitySystem();
      alert(`Cập nhật thành công: ${result.message}`);
      
      // Nếu người dùng hiện tại đăng nhập, cập nhật trạng thái
      if (user && user.user_id) {
        await api.updateUserActivity(user.user_id);
        console.log('Đã cập nhật trạng thái người dùng hiện tại');
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật:', error);
      alert('Lỗi khi cập nhật hệ thống');
    }
  };

  // Hàm cập nhật lại số lượng lời mời kết bạn (gọi sau khi chấp nhận/từ chối)
  const handleFriendRequestUpdate = async () => {
    if (user && user.user_id) {
      try {
        const requests = await api.getReceivedFriendRequests(user.user_id);
        if (requests && Array.isArray(requests)) {
          setFriendRequestCount(requests.length);
        }
      } catch (error) {
        console.error('Lỗi khi cập nhật số lượng lời mời kết bạn:', error);
      }
    }
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
        friendRequestCount={friendRequestCount}
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
            <ContactsSidebar 
              onTabChange={handleContactsTabChange} 
              friendRequestCount={friendRequestCount}
            />
            <ContactsContent 
              activeTab={contactsTab} 
              onFriendRequestUpdate={handleFriendRequestUpdate}
            />
          </div>
        )}
      </div>

      {/* Dropdown khi click vào avatar - sử dụng component UserDropdown thay vì tự tạo */}
      {showProfileDropdown && (
        <UserDropdown
          username={user.username}
          dropdownRef={dropdownRef}
          onLogout={handleLogoutClick}
          onProfileClick={handleProfileClick}
          onSettingsClick={handleSettingsClick}
          onUpdateLastActivity={handleUpdateLastActivity}
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