import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './HomePage.css';
import api from '../../services/api';
import socketService from '../../services/socketService';
import type { Conversation } from '../../services/api';

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
  const [unreadMessageCount, setUnreadMessageCount] = useState<number>(0);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const avatarRef = useRef<HTMLDivElement | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [lastToastId, setLastToastId] = useState<number | null>(null);
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);
  
  const calculateTotalUnreadMessages = (conversations: Conversation[]) => {
    return conversations.reduce((total, conversation) => {
      return total + (conversation.unread_count || 0);
    }, 0);
  };

  const refreshConversations = async () => {
    if (user && user.user_id) {
      try {
        const userConversations = await api.getUserConversations(user.user_id);
        setConversations(userConversations);
        const totalUnread = calculateTotalUnreadMessages(userConversations);
        setUnreadMessageCount(totalUnread);
        console.log(`Tổng số tin nhắn chưa đọc: ${totalUnread}`);
      } catch (error) {
        console.error('Lỗi khi lấy danh sách cuộc trò chuyện:', error);
      }
    }
  };
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'messages') {
      setActiveTab('messages');
      navigate('/', { replace: true });
    }

    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        if (parsedUser.role_id !== 2) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        } else {
          setUser(parsedUser);
          // Đã di chuyển việc khởi tạo socket sang useEffect mới
          refreshConversations(); // Vẫn gọi refreshConversations
        }
      } catch (error) {
        console.error('Lỗi khi parse thông tin người dùng:', error);
        navigate('/login');
      }
    } else {
      navigate('/login');
    }

    const handleOpenConversation = (event: any) => {
      console.log('Nhận sự kiện mở cuộc trò chuyện:', event.detail);
      
      if (event.detail && event.detail.conversation) {
        const conversation = event.detail.conversation;
        console.log('Đang chuyển đến cuộc trò chuyện:', conversation);
        
        setCurrentConversation(conversation);
        
        setActiveTab('messages');
      } else {
        console.error('Sự kiện openConversation không chứa thông tin cuộc trò chuyện');
      }
    };

    window.removeEventListener('openConversation', handleOpenConversation as EventListener);
    window.addEventListener('openConversation', handleOpenConversation as EventListener);

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
      window.removeEventListener('openConversation', handleOpenConversation as EventListener);
    };
  }, [navigate, location]);

  useEffect(() => {
    if (currentConversation && user?.user_id) {
      api.markAllMessagesAsRead(currentConversation.conversation_id, user.user_id)
        .then(() => {
          setConversations(prevConversations => {
            const updatedConversations = prevConversations.map(conv => {
              if (conv.conversation_id === currentConversation.conversation_id) {
                setUnreadMessageCount(prev => Math.max(0, prev - (conv.unread_count || 0)));
                
                return { ...conv, unread_count: 0 };
              }
              return conv;
            });
            return updatedConversations;
          });
        })
        .catch(error => console.error('Lỗi khi đánh dấu tin nhắn đã đọc:', error));
    }
  }, [currentConversation, user]);

  useEffect(() => {
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

    fetchFriendRequests();
    
    const intervalId = setInterval(() => {
      refreshConversations();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [user]);

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
      
      if (user && user.user_id) {
        await api.updateUserActivity(user.user_id);
        console.log('Đã cập nhật trạng thái người dùng hiện tại');
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật:', error);
      alert('Lỗi khi cập nhật hệ thống');
    }
  };

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

  useEffect(() => {
    // Sử dụng âm thanh dưới dạng Data URL thay vì file .mp3
    const notificationSound = "data:audio/mp3;base64,SUQzAwAAAAAAI1RJVDIAAAAZAAAAaHR0cDovL3d3dy5mcmVlc2Z4LmNvLnVrVEFFTgAAABIAAABOb3RpZmljYXRpb24gc291bmRURFJDAAAAEAAAAENvcHlyaWdodCBGcmVlU0ZYSU5GAAAAC5AAAERpc2NsYWltZXI6ClRoaXMgc2FtcGxlIGlzIGZvciBlZHVjYXRpb25hbCBwdXJwb3NlcyBvbmx5LiBJdCBjYW5ub3QgYmUgdXNlZCBpbiBjb21tZXJjaWFsIGNvbnRlbnQsIGFuZCBpdCBtdXN0IG5vdCBiZSByZWRpc3RyaWJ1dGVkLWRlc2NyaXB0aW9uDAAAAFNvdW5kIGVmZmVjdA==";
    notificationSoundRef.current = new Audio(notificationSound);
    
    return () => {
      if (notificationSoundRef.current) {
        notificationSoundRef.current.pause();
        notificationSoundRef.current = null;
      }
    };
  }, []);

  // Khởi tạo socket và đăng ký các sự kiện
  useEffect(() => {
    if (!user || !user.user_id) return;
    
    console.log('Khởi tạo kết nối socket và đăng ký sự kiện...');
    socketService.connect(user.user_id);
    
    const handleFriendRequest = (data: any) => {
      console.log('Nhận lời mời kết bạn mới:', data);
      
      // Cập nhật số lượng lời mời kết bạn
      setFriendRequestCount(prev => data.count || prev + 1);
      
      // Chuyển sang tab lời mời kết bạn nếu đang ở tab danh bạ
      if (activeTab === 'contacts') {
        setContactsTab('requests');
      }
      
      // Hiển thị thông báo toast nếu có thông tin người gửi
      if (data.sender && data.friendship_id !== lastToastId) {
        setToastMessage(`${data.sender.username} đã gửi lời mời kết bạn`);
        setShowToast(true);
        setLastToastId(data.friendship_id);
        
        // Phát âm thanh thông báo
        if (notificationSoundRef.current) {
          notificationSoundRef.current.currentTime = 0;
          notificationSoundRef.current.play().catch(e => console.log('Không thể phát âm thanh:', e));
        }
        
        // Tự động ẩn toast sau 5 giây
        setTimeout(() => {
          setShowToast(false);
        }, 5000);
      }
    };
    
    const handleFriendRequestCountUpdate = (data: any) => {
      console.log('Cập nhật số lượng lời mời kết bạn:', data);
      if (typeof data.count === 'number') {
        setFriendRequestCount(data.count);
      }
    };
    
    const handleNewMessage = (data: any) => {
      console.log('Nhận tin nhắn mới:', data);
      
      if (data.sender_id !== user.user_id) {
        if (!(currentConversation && currentConversation.conversation_id === data.conversation_id)) {
          setUnreadMessageCount(prev => prev + 1);
        }
        
        setConversations(prevConversations => {
          return prevConversations.map(conv => {
            if (conv.conversation_id === data.conversation_id) {
              const newUnreadCount = !(currentConversation && 
                currentConversation.conversation_id === data.conversation_id) 
                ? (conv.unread_count || 0) + 1 
                : conv.unread_count;
              
              return {
                ...conv,
                last_message_id: data.message_id,
                last_message_content: data.content,
                last_message_time: data.created_at,
                unread_count: newUnreadCount
              };
            }
            return conv;
          });
        });
      }
    };
    
    const handleUnreadCountUpdate = () => {
      console.log('Cập nhật số tin nhắn chưa đọc');
      refreshConversations();
    };
    
    // Đăng ký các sự kiện socket
    socketService.on('friend_request', handleFriendRequest);
    socketService.on('friend_request_count_update', handleFriendRequestCountUpdate);
    socketService.on('new_message', handleNewMessage);
    socketService.on('unread_count_update', handleUnreadCountUpdate);
    
    // Kiểm tra kết nối socket mỗi 10 giây và kết nối lại nếu cần
    const socketCheckInterval = setInterval(() => {
      if (user && user.user_id && !socketService.isConnected()) {
        console.log('Phát hiện mất kết nối socket, đang kết nối lại...');
        socketService.connect(user.user_id);
      }
    }, 10000);
    
    return () => {
      console.log('Hủy đăng ký các sự kiện socket');
      clearInterval(socketCheckInterval);
      socketService.off('friend_request', handleFriendRequest);
      socketService.off('friend_request_count_update', handleFriendRequestCountUpdate);
      socketService.off('new_message', handleNewMessage);
      socketService.off('unread_count_update', handleUnreadCountUpdate);
      socketService.disconnect();
    };
  }, [user, activeTab, lastToastId, currentConversation]);

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

  const userInitial = user.username ? user.username.charAt(0).toUpperCase() : '?';

  const handleConversationUpdate = (updatedConversation: Conversation) => {
    setConversations(prevConversations => 
      prevConversations.map(conv => 
        conv.conversation_id === updatedConversation.conversation_id 
          ? updatedConversation 
          : conv
      )
    );
    setCurrentConversation(updatedConversation);
  };

  return (
    <div className="user-home-container">
      <MainSidebar 
        activeTab={activeTab} 
        userInitial={userInitial} 
        onTabChange={handleTabChange} 
        onAvatarClick={handleAvatarClick}
        avatarRef={avatarRef}
        onSettingsClick={handleSettingsClick}
        friendRequestCount={friendRequestCount}
        unreadMessageCount={unreadMessageCount}
      />
      
      <div className="main-content">
        {activeTab === 'messages' ? (
          <div className="messages-container">
            <div className="content-header">
              <h2>Tin nhắn</h2>
            </div>
            <MessagesSidebar 
              userId={user.user_id} 
              currentConversation={currentConversation}
              setCurrentConversation={handleConversationUpdate}
              conversations={conversations}
              setConversations={setConversations}
            />
            <MessagesContent 
              userId={user.user_id}
              currentConversation={currentConversation}
            />
          </div>
        ) : (
          <div className="contacts-container">
            <div className="content-header">
              <h2>{getContactsHeaderTitle()}</h2>
            </div>
            <ContactsSidebar 
              activeTab={contactsTab}
              onTabChange={handleContactsTabChange} 
              friendRequestCount={friendRequestCount}
            />
            <ContactsContent 
              activeTab={contactsTab} 
              onFriendRequestUpdate={handleFriendRequestUpdate}
              userId={user.user_id}
            />
          </div>
        )}
      </div>

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

      <SettingsModal 
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      {showToast && (
        <div className="toast-container">
          <div className="toast-notification">
            <div className="toast-icon">
              <i className="fas fa-user-plus"></i>
            </div>
            <div className="toast-content">
              <div className="toast-title">Lời mời kết bạn mới</div>
              <div className="toast-message">{toastMessage}</div>
            </div>
            <button 
              className="toast-close-button" 
              onClick={() => setShowToast(false)}
            >
              &times;
            </button>
          </div>
        </div>
      )}
      
      <style>
        {`
          .toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
          }
          
          .toast-notification {
            display: flex;
            align-items: center;
            background-color: #fff;
            border-left: 4px solid #0084ff;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            border-radius: 4px;
            padding: 12px 15px;
            min-width: 300px;
            max-width: 350px;
            animation: slideIn 0.3s ease forwards;
          }
          
          .toast-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background-color: #e6f3ff;
            margin-right: 12px;
            flex-shrink: 0;
          }
          
          .toast-icon i {
            color: #0084ff;
            font-size: 14px;
          }
          
          .toast-content {
            flex: 1;
          }
          
          .toast-title {
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 4px;
            color: #333;
          }
          
          .toast-message {
            font-size: 13px;
            color: #666;
          }
          
          .toast-close-button {
            background-color: transparent;
            border: none;
            font-size: 18px;
            color: #aaa;
            cursor: pointer;
            margin-left: 10px;
            padding: 0;
            line-height: 1;
          }
          
          .toast-close-button:hover {
            color: #666;
          }
          
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
};

export default HomePage; 