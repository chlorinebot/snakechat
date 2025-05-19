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
  const socketEventsRegistered = useRef(false);
  
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
          
          socketService.connect(parsedUser.user_id);
          
          if (!socketEventsRegistered.current) {
            socketService.on('friend_request', (data) => {
              console.log('Nhận lời mời kết bạn mới:', data);
              setFriendRequestCount(data.count);
            });
            
            socketService.on('friend_request_count_update', (data) => {
              console.log('Cập nhật số lượng lời mời kết bạn:', data);
              setFriendRequestCount(data.count);
            });

            socketService.on('new_message', (data) => {
              console.log('Nhận tin nhắn mới:', data);
              
              if (data.sender_id !== parsedUser.user_id) {
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
            });
            
            socketService.on('unread_count_update', (data) => {
              console.log('Cập nhật số tin nhắn chưa đọc:', data);
              
              refreshConversations();
            });
            
            socketService.on('message_read_receipt', (data) => {
              console.log('Nhận xác nhận đã đọc:', data);
              
              if (data.conversation_id && data.reader_id && data.message_ids) {
                // Cập nhật trạng thái "đã xem" cho tin nhắn nếu đang hiển thị
                // Thực hiện trong MessagesContent
              }
            });
            
            socketEventsRegistered.current = true;
          }
          
          refreshConversations();
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
      socketService.disconnect();
      socketService.off('friend_request');
      socketService.off('friend_request_count_update');
      socketService.off('new_message');
      socketService.off('unread_count_update');
      socketService.off('message_read_receipt');
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
    </div>
  );
};

export default HomePage; 