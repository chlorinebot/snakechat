import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './HomePage.css';
import api from '../../services/api';
import socketService from '../../services/socketService';
import type { Conversation, ConversationMember } from '../../services/api';
import { playNotificationSound, playMessageSound } from '../../utils/sound';

// Import các components
import MainSidebar from '../../components/home_user/MainSidebar';
import UserDropdown from '../../components/home_user/UserDropdown';
import MessagesSidebar from '../../components/home_user/MessagesSidebar';
import MessagesContent from '../../components/home_user/MessagesContent';
import ContactsSidebar from '../../components/home_user/ContactsSidebar';
import ContactsContent from '../../components/home_user/ContactsContent';
import SettingsModal from '../../components/home_user/SettingsModal';
import ProfileModal from '../../components/home_user/ProfileModal';
import UserProfileModal from '../../components/home_user/UserProfileModal';

interface UserProps {
  onLogout: () => void;
}

type ActiveTab = 'messages' | 'contacts';
type ContactTab = 'friends' | 'requests' | 'explore' | 'blocked';

const HomePage: React.FC<UserProps> = ({ onLogout }) => {
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('user') || '{}'));
  // Đảm bảo cập nhật trạng thái user khi có thay đổi từ server
  useEffect(() => {
    if (user?.user_id) {
      // Cập nhật thông tin người dùng mỗi 30 giây
      const userRefreshInterval = setInterval(async () => {
        try {
          const userData = await api.getUserById(user.user_id);
          if (userData) {
            setUser((prevUser: any) => ({
              ...prevUser,
              status: userData.status || prevUser.status,
              last_activity: userData.last_activity || prevUser.last_activity
            }));
          }
        } catch (error) {
          console.error('Lỗi khi cập nhật thông tin người dùng:', error);
        }
      }, 30000);
      
      return () => clearInterval(userRefreshInterval);
    }
  }, [user?.user_id]);
  const [showProfileDropdown, setShowProfileDropdown] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('messages');
  const [contactsTab, setContactsTab] = useState<ContactTab>('friends');
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [friendRequestCount, setFriendRequestCount] = useState<number>(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState<number>(0);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [showUserProfileModal, setShowUserProfileModal] = useState<boolean>(false);
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(undefined);
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const avatarRef = useRef<HTMLDivElement | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [lastToastId, setLastToastId] = useState<number | null>(null);
  const [friendIds, setFriendIds] = useState<number[]>([]);
  
  // Tự động cập nhật tổng số tin nhắn chưa đọc khi danh sách conversations thay đổi
  useEffect(() => {
    const total = calculateTotalUnreadMessages(conversations);
    setUnreadMessageCount(total);
  }, [conversations]);

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
      // Effect markAllMessagesAsRead đã chuyển logic sang MessagesContent
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
        
        // Phát âm thanh thông báo lời mời kết bạn
        playNotificationSound();
        
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
    
    const handleUnreadCountUpdate = (data: any) => {
      console.log('Nhận cập nhật số tin nhắn chưa đọc từ socket, làm mới conversations', data);
      refreshConversations();
      // Âm thanh đã được xử lý trong sự kiện new_message
    };
    
    // Cập nhật trạng thái hoạt động người dùng theo thời gian thực
    const handleUserStatusUpdate = (data: any) => {
      const { user_id, status, last_activity } = data;
      // Cập nhật danh sách conversations
      setConversations(prev => prev.map(conv => ({
        ...conv,
        members: conv.members?.map(m => m.user_id === user_id ? { ...m, status, last_activity } : m)
      })));
      // Cập nhật currentConversation nếu đang hiển thị
      if (currentConversation?.members) {
        setCurrentConversation({
          ...currentConversation,
          members: currentConversation.members.map(m => m.user_id === user_id ? { ...m, status, last_activity } : m)
        });
      }
    };
    socketService.on('user_status_update', handleUserStatusUpdate);
    
    // Đăng ký các sự kiện socket
    socketService.on('friend_request', handleFriendRequest);
    socketService.on('friend_request_count_update', handleFriendRequestCountUpdate);
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
      socketService.off('unread_count_update', handleUnreadCountUpdate);
      socketService.off('user_status_update', handleUserStatusUpdate);
      socketService.disconnect();
    };
  }, [user, activeTab, lastToastId, currentConversation]);

  // Lấy danh sách bạn bè
  useEffect(() => {
    const loadFriends = async () => {
      if (user?.user_id) {
        try {
          const friends = await api.getFriends(user.user_id);
          // Lấy mảng các ID của bạn bè
          const ids = friends.map(friend => friend.user_id);
          setFriendIds(ids);
          console.log('Danh sách ID bạn bè:', ids);
        } catch (error) {
          console.error('Lỗi khi tải danh sách bạn bè:', error);
        }
      }
    };
    
    loadFriends();
    
    // Thêm interval để làm mới trạng thái hoạt động của tất cả người dùng mỗi 10 giây
    const statusRefreshInterval = setInterval(async () => {
      if (user?.user_id) {
        try {
          // Lấy lại danh sách bạn bè với trạng thái mới nhất
          const friends = await api.getFriends(user.user_id);
          setFriendIds(friends.map(friend => friend.user_id));
          
          // Cập nhật trạng thái người dùng trong danh sách cuộc trò chuyện
          if (conversations.length > 0) {
            const updatedConversations = [...conversations];
            let hasChanges = false;
            
            // Cập nhật trạng thái cho từng người dùng trong danh sách cuộc trò chuyện
            for (const conversation of updatedConversations) {
              if (conversation.members) {
                for (const friend of friends) {
                  // Tìm và cập nhật trạng thái thành viên là bạn bè
                  const memberIndex = conversation.members.findIndex(m => m.user_id === friend.user_id);
                  if (memberIndex !== -1) {
                    const oldStatus = conversation.members[memberIndex].status;
                    const oldActivity = (conversation.members[memberIndex] as any).last_activity;
                    
                    if (oldStatus !== friend.status || oldActivity !== friend.last_activity) {
                      // Sử dụng kiểu dữ liệu any để tránh lỗi TypeScript
                      const updatedMember = {
                        ...conversation.members[memberIndex],
                        status: friend.status
                      } as any;
                      
                      // Thêm thuộc tính last_activity vào đối tượng any
                      updatedMember.last_activity = friend.last_activity;
                      
                      // Gán lại vào mảng members
                      conversation.members[memberIndex] = updatedMember;
                      hasChanges = true;
                    }
                  }
                }
              }
            }
            
            // Chỉ cập nhật state nếu có thay đổi để tránh re-render không cần thiết
            if (hasChanges) {
              setConversations(updatedConversations);
              
              // Cập nhật currentConversation nếu đang hiển thị
              if (currentConversation?.conversation_id) {
                const updatedCurrent = updatedConversations.find(
                  conv => conv.conversation_id === currentConversation.conversation_id
                );
                if (updatedCurrent) {
                  setCurrentConversation(updatedCurrent);
                }
              }
            }
          }
        } catch (error) {
          console.error('Lỗi khi làm mới trạng thái hoạt động:', error);
        }
      }
    }, 10000);
    
    return () => {
      clearInterval(statusRefreshInterval);
    };
  }, [user?.user_id, conversations, currentConversation]);

  // Đăng ký sự kiện socket cho tin nhắn mới
  useEffect(() => {
    // Tạo Set để theo dõi tin nhắn đã xử lý để tránh phát âm thanh trùng lặp
    const processedMessageIds = new Set<string>();

    // Xử lý tin nhắn mới
    const handleNewMessage = (data: any) => {
      console.log('HomePage nhận tin nhắn mới:', data);
      
      // Tạo key duy nhất cho tin nhắn này
      const messageKey = `msg_${data.message_id}`;
      
      // Kiểm tra xem tin nhắn này đã được xử lý chưa
      if (!processedMessageIds.has(messageKey)) {
        // Đánh dấu tin nhắn đã được xử lý
        processedMessageIds.add(messageKey);
        
        // Xóa ID tin nhắn sau 5 giây để tránh tràn bộ nhớ
        setTimeout(() => {
          processedMessageIds.delete(messageKey);
        }, 5000);
        
        // Phát âm thanh khi nhận tin nhắn mới từ người khác
        if (data.sender_id !== user?.user_id) {
          console.log('Phát âm thanh tin nhắn mới');
          // Luôn phát âm thanh khi có tin nhắn mới, bất kể đang ở đâu
          playMessageSound(); // Sử dụng sound_mess.mp3
        }
      }
    };
    
    // Đăng ký lắng nghe sự kiện
    if (user) {
      socketService.on('new_message', handleNewMessage);
    }
    
    // Cleanup khi component unmount
    return () => {
      if (user) {
        socketService.off('new_message', handleNewMessage);
      }
    };
  }, [user, currentConversation, activeTab]);

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
      case 'blocked':
        return 'Người đã chặn';
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

  // Lấy tên cuộc trò chuyện cho header
  const getConversationName = (conversation: Conversation) => {
    if (conversation.conversation_type === 'personal' && conversation.members) {
      const other = conversation.members.find(member => member.user_id !== user.user_id);
      return other?.username || 'Người dùng';
    }
    return `Nhóm (${conversation.members?.length || 0} thành viên)`;
  };

  // Hàm tính thời gian chênh lệch và hiển thị trạng thái hoạt động
  const getMemberStatusText = (member?: ConversationMember) => {
    if (!member) return 'Ngoại tuyến';

    // Kiểm tra xem người dùng có phải là bạn bè không
    const isFriend = friendIds.includes(member.user_id);
    
    // Nếu không phải bạn bè, luôn hiển thị là ngoại tuyến
    if (!isFriend) return 'Ngoại tuyến';
    
    // Nếu là bạn bè, hiển thị trạng thái thực tế
    if (member.status === 'online') return 'Đang hoạt động';
    if ((member as any).last_activity) {
      const last = (member as any).last_activity;
      const diffMin = Math.floor((Date.now() - new Date(last).getTime()) / 60000);
      if (diffMin < 60) return `Hoạt động lần cuối ${diffMin} phút trước`;
      const diffH = Math.floor(diffMin / 60);
      return `Hoạt động lần cuối ${diffH} giờ trước`;
    }
    return 'Ngoại tuyến';
  };
  const getMemberStatusColor = (member?: ConversationMember) => {
    // Kiểm tra xem người dùng có phải là bạn bè không
    if (!member) return '#CCCCCC';
    
    // Kiểm tra xem member.user_id có nằm trong danh sách bạn bè không
    const isFriend = friendIds.includes(member.user_id);
    
    // Nếu không phải bạn bè, luôn trả về màu offline
    if (!isFriend) return '#CCCCCC';
    
    // Nếu là bạn bè, trả về màu dựa trên trạng thái
    return member.status === 'online' ? '#4CAF50' : '#CCCCCC';
  };

  // Xử lý khi click vào avatar hoặc tên người dùng trong header tin nhắn
  const handleUserHeaderClick = () => {
    if (!currentConversation || currentConversation.conversation_type !== 'personal') return;
    
    // Tìm người dùng khác trong cuộc trò chuyện (không phải người dùng hiện tại)
    const otherMember = currentConversation.members?.find(member => member.user_id !== user.user_id);
    
    if (otherMember && otherMember.user_id) {
      // Đặt ID người dùng được chọn và hiển thị modal
      setSelectedUserId(otherMember.user_id);
      setShowUserProfileModal(true);
    }
  };
  
  // Đóng modal thông tin người dùng
  const handleCloseUserProfileModal = () => {
    setShowUserProfileModal(false);
    setSelectedUserId(undefined);
  };
  
  // Xử lý khi có cập nhật từ UserProfileModal (ví dụ: gửi lời mời kết bạn, chấp nhận lời mời...)
  const handleUserProfileUpdate = () => {
    // Làm mới danh sách bạn bè
    if (user?.user_id) {
      api.getFriends(user.user_id).then(friends => {
        const ids = friends.map(friend => friend.user_id);
        setFriendIds(ids);
      }).catch(error => {
        console.error('Lỗi khi làm mới danh sách bạn bè:', error);
      });
    }
    
    // Cập nhật số lượng lời mời kết bạn
    handleFriendRequestUpdate();
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
              {currentConversation ? (
                <>
                  <div 
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#0066ff',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '16px',
                      marginRight: '10px',
                      cursor: 'pointer'
                    }}
                    onClick={handleUserHeaderClick}
                  >
                    {getConversationName(currentConversation).charAt(0).toUpperCase()}
                  </div>
                  <div 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                    onClick={handleUserHeaderClick}
                  >
                    <h2 style={{ margin: 0 }}>{getConversationName(currentConversation)}</h2>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginTop: '4px',
                      fontSize: '14px',
                      color: '#888'
                    }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: getMemberStatusColor(
                          currentConversation.members?.find(m => m.user_id !== user.user_id)
                        ),
                        display: 'inline-block',
                        marginRight: '6px'
                      }} />
                      {getMemberStatusText(
                        currentConversation.members?.find(m => m.user_id !== user.user_id)
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <h2>Tin nhắn</h2>
              )}
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
          userStatus={user.status}
          lastActivity={user.last_activity}
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
      
      {showUserProfileModal && selectedUserId && (
        <UserProfileModal
          isOpen={showUserProfileModal}
          onClose={handleCloseUserProfileModal}
          userId={selectedUserId}
          onFriendRequestSent={handleUserProfileUpdate}
        />
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