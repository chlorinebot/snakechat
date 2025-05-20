import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import type { User, FriendRequest } from '../../services/api';
import UserProfileModal from './UserProfileModal';
import SortDropdown from '../common/SortDropdown';
import type { SortOption } from '../common/SortDropdown';
import socketService from '../../services/socketService';

interface ContactsContentProps {
  activeTab?: 'friends' | 'requests' | 'explore';
  onFriendRequestUpdate?: () => void; // Callback khi có thay đổi về lời mời kết bạn
  userId?: number; // ID của người dùng hiện tại
}

const ContactsContent: React.FC<ContactsContentProps> = ({ activeTab = 'friends', onFriendRequestUpdate, userId }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(undefined);
  const [showUserProfileModal, setShowUserProfileModal] = useState<boolean>(false);
  const [friendsList, setFriendsList] = useState<User[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [processingRequest, setProcessingRequest] = useState<{ [key: number]: boolean }>({});
  
  // Thêm state để lưu trữ trạng thái kết bạn của các người dùng trong kết quả tìm kiếm
  const [friendshipStatuses, setFriendshipStatuses] = useState<{ [key: number]: string }>({});
  
  // Thêm state để lưu trữ trạng thái khóa của người dùng
  const [lockedUsers, setLockedUsers] = useState<{ [key: number]: boolean }>({});
  
  // Thêm state cho việc sắp xếp
  const [sortOptions] = useState<SortOption[]>([
    { id: 'name-asc', label: 'Tên (A-Z)' },
    { id: 'name-desc', label: 'Tên (Z-A)' },
    { id: 'newest', label: 'Mới nhất' },
    { id: 'oldest', label: 'Cũ nhất' }
  ]);
  const [selectedSortOption, setSelectedSortOption] = useState<SortOption>(sortOptions[0]);

  useEffect(() => {
    // Lấy thông tin người dùng hiện tại từ localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        console.log("Thông tin người dùng hiện tại từ localStorage:", parsedUser);
        setCurrentUser(parsedUser);
      } catch (error) {
        console.error('Lỗi khi parse thông tin người dùng:', error);
      }
    } else {
      console.log("Không tìm thấy thông tin người dùng trong localStorage");
    }
  }, []);

  // Lấy danh sách bạn bè và lời mời kết bạn khi tab thay đổi hoặc người dùng hiện tại thay đổi
  useEffect(() => {
    if (!currentUser) return;

    const fetchFriendsData = async () => {
      if (activeTab === 'friends') {
        try {
          let friends;
          
          // Trước tiên kiểm tra cache trong localStorage
          const cachedFriends = localStorage.getItem('cachedFriends');
          if (cachedFriends) {
            // Sử dụng cache nếu có
            friends = JSON.parse(cachedFriends);
            console.log('Sử dụng danh sách bạn bè từ cache:', friends);
            setFriendsList(friends);
            
            // Đồng thời gọi API để cập nhật dữ liệu mới nhất
            const freshFriends = await api.refreshFriendStatus(currentUser.user_id!);
            if (freshFriends && freshFriends.length > 0) {
              console.log('Cập nhật danh sách bạn bè từ server:', freshFriends);
              setFriendsList(freshFriends);
              
              // Kiểm tra trạng thái khóa của từng người dùng trong danh sách bạn bè
              const lockedStatusMap: { [key: number]: boolean } = {};
              for (const friend of freshFriends) {
                if (friend.user_id) {
                  try {
                    const lockStatus = await api.checkAccountLockStatus(friend.user_id);
                    console.log(`Thông tin khóa của ${friend.username}:`, {
                      userId: friend.user_id,
                      isLocked: lockStatus.isLocked,
                      lock_status: friend.lock_status
                    });
                    lockedStatusMap[friend.user_id] = friend.lock_status === 'locked';
                  } catch (err) {
                    console.error(`Lỗi khi kiểm tra trạng thái khóa của người dùng ${friend.username}:`, err);
                  }
                }
              }
              setLockedUsers(lockedStatusMap);
            }
          } else {
            // Không có cache, gọi API trực tiếp
            friends = await api.getFriends(currentUser.user_id!);
            console.log('Lấy danh sách bạn bè trực tiếp từ API:', friends);
            setFriendsList(friends);
            
            // Kiểm tra trạng thái khóa của từng người dùng trong danh sách bạn bè
            const lockedStatusMap: { [key: number]: boolean } = {};
            for (const friend of friends) {
              if (friend.user_id) {
                try {
                  const lockStatus = await api.checkAccountLockStatus(friend.user_id);
                  console.log(`Thông tin khóa của ${friend.username}:`, {
                    userId: friend.user_id,
                    isLocked: lockStatus.isLocked,
                    lock_status: friend.lock_status
                  });
                  lockedStatusMap[friend.user_id] = friend.lock_status === 'locked';
                } catch (err) {
                  console.error(`Lỗi khi kiểm tra trạng thái khóa của người dùng ${friend.username}:`, err);
                }
              }
            }
            setLockedUsers(lockedStatusMap);
          }
        } catch (error) {
          console.error('Lỗi khi lấy danh sách bạn bè:', error);
        }
      } else if (activeTab === 'requests') {
        try {
          const requests = await api.getReceivedFriendRequests(currentUser.user_id!);
          console.log('Danh sách lời mời kết bạn:', requests);
          setFriendRequests(requests);
          
          // Kiểm tra trạng thái khóa của người gửi lời mời kết bạn
          const lockedStatusMap: { [key: number]: boolean } = {};
          for (const request of requests) {
            if (request.user.user_id) {
              try {
                const lockStatus = await api.checkAccountLockStatus(request.user.user_id);
                console.log(`Thông tin khóa của ${request.user.username}:`, {
                  userId: request.user.user_id,
                  isLocked: lockStatus.isLocked,
                  lock_status: request.user.lock_status
                });
                lockedStatusMap[request.user.user_id] = request.user.lock_status === 'locked';
              } catch (err) {
                console.error(`Lỗi khi kiểm tra trạng thái khóa của người dùng ${request.user.username}:`, err);
              }
            }
          }
          setLockedUsers(prevState => ({...prevState, ...lockedStatusMap}));
        } catch (error) {
          console.error('Lỗi khi lấy danh sách lời mời kết bạn:', error);
        }
      }
    };

    fetchFriendsData();
  }, [activeTab, currentUser, onFriendRequestUpdate]);

  // Lắng nghe sự kiện lời mời kết bạn mới và cập nhật theo thời gian thực
  useEffect(() => {
    // Hàm xử lý khi nhận được lời mời kết bạn mới
    const handleNewFriendRequest = (data: any) => {
      console.log('Nhận lời mời kết bạn mới trong ContactsContent:', data);
      if (data && data.sender) {
        // Kiểm tra xem lời mời này đã tồn tại trong danh sách chưa
        const existingRequest = friendRequests.find(
          req => req.friendship_id === data.friendship_id
        );
        
        if (!existingRequest) {
          // Thêm lời mời mới vào đầu danh sách hiện tại
          setFriendRequests(prevRequests => [{
            friendship_id: data.friendship_id,
            user: data.sender,
            status: 'pending',
            created_at: new Date().toISOString()
          }, ...prevRequests]);
          
          // Gọi callback cập nhật nếu có
          if (onFriendRequestUpdate) {
            onFriendRequestUpdate();
          }
        }
      }
    };

    // Hàm xử lý khi số lượng lời mời kết bạn được cập nhật
    const handleFriendRequestCountUpdate = (data: any) => {
      console.log('Cập nhật số lượng lời mời kết bạn trong ContactsContent:', data);
      // Nếu số lượng lời mời khác với số lượng hiện tại, cập nhật lại danh sách
      if (typeof data.count === 'number' && data.count !== friendRequests.length) {
        fetchFriendRequests();
      }
    };

    // Đăng ký các sự kiện socket
    socketService.on('friend_request', handleNewFriendRequest);
    socketService.on('friend_request_count_update', handleFriendRequestCountUpdate);

    // Hủy đăng ký khi component unmount
    return () => {
      socketService.off('friend_request', handleNewFriendRequest);
      socketService.off('friend_request_count_update', handleFriendRequestCountUpdate);
    };
  }, [userId, friendRequests, onFriendRequestUpdate]);

  // Xử lý tìm kiếm khi người dùng nhập
  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    
    if (term.length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    
    setLoading(true);
    try {
      const results = await api.searchUsers(term);
      setSearchResults(results);
      setHasSearched(true);
      
      // Kiểm tra trạng thái kết bạn và khóa của mỗi người dùng trong kết quả tìm kiếm
      if (currentUser && currentUser.user_id) {
        const statuses: { [key: number]: string } = {};
        const lockedStatusMap: { [key: number]: boolean } = {};
        
        for (const user of results) {
          if (user.user_id && user.user_id !== currentUser.user_id) {
            try {
              // Kiểm tra trạng thái kết bạn
              const status = await api.checkFriendshipStatus(currentUser.user_id, user.user_id);
              console.log(`Trạng thái kết bạn với ${user.username}:`, status);
              if (status && status.status) {
                statuses[user.user_id] = status.status;
              }
              
              // Kiểm tra trạng thái khóa tài khoản
              const lockStatus = await api.checkAccountLockStatus(user.user_id);
              console.log(`Thông tin khóa của ${user.username}:`, {
                userId: user.user_id,
                isLocked: lockStatus.isLocked,
                lock_status: user.lock_status
              });
              lockedStatusMap[user.user_id] = user.lock_status === 'locked';
              console.log(`Trạng thái khóa của ${user.username}:`, user.lock_status === 'locked');
            } catch (err) {
              console.error(`Lỗi khi kiểm tra trạng thái người dùng ${user.username}:`, err);
            }
          }
        }
        
        setFriendshipStatuses(statuses);
        setLockedUsers(prevState => ({...prevState, ...lockedStatusMap}));
      }
    } catch (error) {
      console.error('Lỗi khi tìm kiếm người dùng:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Xử lý khi thay đổi tùy chọn sắp xếp
  const handleSortChange = (option: SortOption) => {
    setSelectedSortOption(option);
    // Sắp xếp danh sách bạn bè theo tùy chọn đã chọn
    const sortedFriends = [...friendsList].sort((a, b) => {
      switch (option.id) {
        case 'name-asc':
          return a.username.localeCompare(b.username);
        case 'name-desc':
          return b.username.localeCompare(a.username);
        case 'newest':
          return new Date(b.join_date || 0).getTime() - new Date(a.join_date || 0).getTime();
        case 'oldest':
          return new Date(a.join_date || 0).getTime() - new Date(b.join_date || 0).getTime();
        default:
          return 0;
      }
    });
    setFriendsList(sortedFriends);
  };

  // Xử lý khi người dùng nhấn phím Enter
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(searchTerm);
    }
  };

  // Kiểm tra xem user có phải là người dùng hiện tại không
  const isCurrentUser = (user: User) => {
    if (!currentUser || !user) return false;
    
    // Kiểm tra xác thực bằng email (cách chính xác nhất)
    if (user.email && currentUser.email && user.email === currentUser.email) {
      console.log("Trùng khớp theo email!");
      return true;
    }
    
    // Kiểm tra bằng username nếu email không có hoặc không khớp
    if (user.username && currentUser.username && user.username === currentUser.username) {
      console.log("Trùng khớp theo username!");
      return true;
    }
    
    // Kiểm tra bằng ID nếu có
    if (user.user_id && currentUser.user_id && user.user_id === currentUser.user_id) {
      console.log("Trùng khớp theo user_id!");
      return true;
    }
    
    console.log("Không trùng khớp!");
    // Nếu tất cả đều không khớp
    return false;
  };

  // Xử lý khi click vào user để mở modal
  const handleUserClick = (user: User, friendshipId?: number, fromFriendRequest = false) => {
    setSelectedUserId(user.user_id);
    // Thêm vào state thông tin về lời mời kết bạn nếu có
    if (fromFriendRequest && friendshipId) {
      // Lưu lại thông tin về lời mời kết bạn vào localStorage để sử dụng trong UserProfileModal
      localStorage.setItem('currentFriendRequest', JSON.stringify({
        friendshipId,
        fromFriendRequest: true
      }));
    } else {
      // Nếu không phải mở từ lời mời kết bạn, xóa dữ liệu này nếu có
      localStorage.removeItem('currentFriendRequest');
    }
    setShowUserProfileModal(true);
  };

  // Đóng modal
  const handleCloseUserProfileModal = () => {
    setShowUserProfileModal(false);
    setSelectedUserId(undefined);
  };

  // Xử lý khi chấp nhận lời mời kết bạn
  const handleAcceptFriendRequest = async (friendshipId: number) => {
    if (!currentUser) return;
    
    setProcessingRequest({...processingRequest, [friendshipId]: true});
    try {
      const result = await api.acceptFriendRequest(friendshipId);
      
      if (result.success) {
        console.log('Đã chấp nhận lời mời kết bạn');
        
        // Cập nhật danh sách lời mời kết bạn
        setFriendRequests(requests => requests.filter(request => request.friendship_id !== friendshipId));
        
        // Gọi callback nếu có
        if (onFriendRequestUpdate) {
          onFriendRequestUpdate();
        }
      }
    } catch (error) {
      console.error('Lỗi khi chấp nhận lời mời kết bạn:', error);
    } finally {
      // Xóa trạng thái xử lý
      setProcessingRequest(prev => {
        const newState = {...prev};
        delete newState[friendshipId];
        return newState;
      });
    }
  };

  // Xử lý khi từ chối lời mời kết bạn
  const handleRejectFriendRequest = async (friendshipId: number) => {
    if (!currentUser) return;
    
    setProcessingRequest({...processingRequest, [friendshipId]: true});
    try {
      const result = await api.rejectFriendRequest(friendshipId);
      
      if (result.success) {
        console.log('Đã từ chối lời mời kết bạn');
        
        // Cập nhật danh sách lời mời kết bạn
        setFriendRequests(requests => requests.filter(request => request.friendship_id !== friendshipId));
        
        // Gọi callback nếu có
        if (onFriendRequestUpdate) {
          onFriendRequestUpdate();
        }
      }
    } catch (error) {
      console.error('Lỗi khi từ chối lời mời kết bạn:', error);
    } finally {
      // Xóa trạng thái xử lý
      setProcessingRequest(prev => {
        const newState = {...prev};
        delete newState[friendshipId];
        return newState;
      });
    }
  };

  // Xử lý sau khi cập nhật từ ProfileModal
  const handleProfileModalUpdate = () => {
    console.log('ProfileModal đã được cập nhật, làm mới dữ liệu...');
    // Gọi callback để cập nhật danh sách bạn bè và lời mời kết bạn
    if (onFriendRequestUpdate) {
      onFriendRequestUpdate();
    }
  };

  // Format thời gian lời mời kết bạn
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 60) {
        return `${diffMins} phút trước`;
      } else if (diffHours < 24) {
        return `${diffHours} giờ trước`;
      } else {
        return `${diffDays} ngày trước`;
      }
    } catch (error) {
      console.error('Lỗi khi format thời gian:', error);
      return 'N/A';
    }
  };

  // Kiểm tra trạng thái online
  const isOnline = (status?: string) => {
    if (status === undefined || status === null) {
      return false;
    }
    return status.toLowerCase() === 'online';
  };

  // Kiểm tra quyền xem trạng thái người dùng
  const canViewUserStatus = async (userId: number | undefined) => {
    if (!userId || !currentUser || !currentUser.user_id) return false;
    
    // Nếu là chính mình
    if (userId === currentUser.user_id) return true;
    
    // Kiểm tra xem có phải bạn bè không
    const isFriend = friendsList.some(friend => friend.user_id === userId);
    
    // Nếu là bạn bè thì được xem trạng thái
    return isFriend;
  };

  // Hàm tạo lớp CSS cho trạng thái hoạt động
  const getStatusIndicatorClass = (status?: string, userId?: number) => {
    // Kiểm tra xem có bị khóa không
    if (userId && lockedUsers[userId]) {
      return 'status-banned';
    }
    
    // Nếu là bản thân người dùng, luôn hiển thị trạng thái
    if (userId && currentUser && userId === currentUser.user_id) {
      return isOnline(status) ? 'status-online' : 'status-offline';
    }
    
    // Lấy thông tin từ danh sách bạn bè đã có sẵn
    const isFriend = userId && friendsList.some(friend => friend.user_id === userId);
    
    // Nếu không phải bạn bè, hiển thị trạng thái không xác định
    if (!isFriend) {
      return 'status-unknown';
    }
    
    return isOnline(status) ? 'status-online' : 'status-offline';
  };

  // Kiểm tra trạng thái kết bạn của một người dùng
  const checkFriendshipStatus = (userId?: number) => {
    if (!userId || !currentUser) return null;
    
    // Kiểm tra xem người dùng có trong danh sách bạn bè không
    const isFriend = friendsList.some(friend => friend.user_id === userId);
    if (isFriend) return 'accepted';
    
    // Kiểm tra từ state các trạng thái kết bạn đã lưu
    return friendshipStatuses[userId] || null;
  };
  
  // Kiểm tra xem người dùng có bị khóa không
  const isUserLocked = (userId?: number) => {
    if (!userId) return false;
    return !!lockedUsers[userId];
  };
  
  // Hiển thị avatar theo trạng thái khóa
  const renderAvatar = (user: User) => {
    if (isUserLocked(user.user_id)) {
      return (
        <div className="contact-avatar banned-avatar">
          BAN
          <div className={`status-indicator ${getStatusIndicatorClass(user.status, user.user_id)}`}></div>
        </div>
      );
    }
    
    return (
      <div className="contact-avatar">
        {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
        <div className={`status-indicator ${getStatusIndicatorClass(user.status, user.user_id)}`}></div>
      </div>
    );
  };

  // Render danh sách bạn bè
  const renderFriendsList = () => {
    if (friendsList.length === 0) {
      return (
        <div className="contacts-empty">
          <div className="contacts-empty-icon"></div>
          <h3>Không có bạn bè nào</h3>
          <p>Danh sách bạn bè của bạn đang trống</p>
        </div>
      );
    }

    // Sắp xếp theo mới nhất/cũ nhất (không hiển thị nhóm A-Z)
    if (selectedSortOption.id === 'newest' || selectedSortOption.id === 'oldest') {
      return (
        <div className="friends-container">
          {friendsList.map((friend) => (
            <div key={friend.user_id} className="contact-item" onClick={() => handleUserClick(friend)}>
              {renderAvatar(friend)}
              <div className="contact-info">
                <div className="contact-name">{friend.username}</div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Sắp xếp theo tên A-Z hoặc Z-A (hiển thị nhóm A-Z)
    const groupedFriends: { [key: string]: User[] } = {};
    
    // Nhóm bạn bè theo chữ cái đầu tiên của tên
    friendsList.forEach((friend) => {
      if (!friend.username) return;
      
      const firstChar = friend.username.charAt(0).toUpperCase();
      if (!groupedFriends[firstChar]) {
        groupedFriends[firstChar] = [];
      }
      groupedFriends[firstChar].push(friend);
    });

    // Lấy danh sách chữ cái đã sắp xếp
    const sortedLetters = Object.keys(groupedFriends).sort();
    
    return (
      <div className="friends-container-with-groups">
        {sortedLetters.map((letter) => (
          <div key={letter} className="friends-group">
            <div className="friends-group-header">
              <span className="friends-group-letter">{letter}</span>
            </div>
            {groupedFriends[letter].map((friend) => (
              <div key={friend.user_id} className="contact-item" onClick={() => handleUserClick(friend)}>
                {renderAvatar(friend)}
                <div className="contact-info">
                  <div className="contact-name">{friend.username}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  // Render danh sách lời mời kết bạn
  const renderFriendRequests = () => {
    if (friendRequests.length === 0) {
      return (
        <div className="contacts-empty">
          <div className="contacts-empty-icon friend-request-icon"></div>
          <h3>Không có lời mời kết bạn</h3>
          <p>Bạn không có lời mời kết bạn nào</p>
        </div>
      );
    }

    const friendRequestItemStyle = {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '15px',
      padding: '5px',
      borderRadius: '10px',
      border: '1px solid #e0e0e0'
    };

    const userInfoStyle = {
      display: 'flex',
      alignItems: 'center',
      cursor: 'pointer',
      padding: '10px',
      borderRadius: '8px',
      transition: 'background-color 0.2s'
    };

    return (
      <div className="friend-requests-container">
        {friendRequests.map((request) => (
          <div key={request.friendship_id} className="friend-request-item" style={friendRequestItemStyle}>
            <div 
              className="user-info-container"
              onClick={() => handleUserClick(request.user, request.friendship_id, true)}
              style={userInfoStyle}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {isUserLocked(request.user.user_id) ? (
                <div className="friend-request-avatar banned-avatar">
                  BAN
                </div>
              ) : (
                <div className="friend-request-avatar">
                  {request.user.username ? request.user.username.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div className="friend-request-info">
                <div className="friend-request-name">{request.user.username}</div>
                <div className="friend-request-time">{formatTime(request.created_at)}</div>
              </div>
            </div>
            <div className="friend-request-actions">
              <button 
                className="accept-request-btn"
                onClick={() => handleAcceptFriendRequest(request.friendship_id)}
                disabled={!!processingRequest[request.friendship_id] || isUserLocked(request.user.user_id)}
              >
                {processingRequest[request.friendship_id] ? 'Đang xử lý...' : 'Chấp nhận'}
              </button>
              <button 
                className="reject-request-btn"
                onClick={() => handleRejectFriendRequest(request.friendship_id)}
                disabled={!!processingRequest[request.friendship_id]}
              >
                {processingRequest[request.friendship_id] ? 'Đang xử lý...' : 'Từ chối'}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Hàm lấy danh sách lời mời kết bạn
  const fetchFriendRequests = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const requests = await api.getReceivedFriendRequests(userId);
      setFriendRequests(requests || []);
      
      // Gọi callback nếu có
      if (onFriendRequestUpdate) {
        onFriendRequestUpdate();
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách lời mời kết bạn:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (activeTab === 'requests' && userId) {
      fetchFriendRequests();
    }
  }, [activeTab, userId]);

  return (
    <div className="contacts-content">
      {activeTab === 'friends' && (
        <div className="contacts-header">
          <div className="friends-count">
            <span style={{ color: '#000', fontWeight: 600 }}>{friendsList.length} bạn bè</span>
          </div>
          <div className="contacts-search-bar">
            <div className="search-icon"></div>
            <input 
              type="text" 
              placeholder="Tìm kiếm bạn bè..."
              className="contacts-search-input" 
            />
          </div>
          <div className="sort-dropdown-container">
            <SortDropdown 
              options={sortOptions}
              selectedOption={selectedSortOption}
              onSelect={handleSortChange}
            />
          </div>
        </div>
      )}
      {activeTab === 'explore' && (
        <div className="contacts-search-bar">
          <div className="search-icon"></div>
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tìm kiếm người dùng theo tên hoặc email..."
            className="contacts-search-input" 
          />
        </div>
      )}
      
      <div className="contacts-list">
        {activeTab === 'friends' ? (
          renderFriendsList()
        ) : activeTab === 'requests' ? (
          renderFriendRequests()
        ) : activeTab === 'explore' && loading ? (
          <div className="contacts-loading">
            <p>Đang tìm kiếm...</p>
          </div>
        ) : activeTab === 'explore' && hasSearched && searchResults.length > 0 ? (
          (() => {
            console.log("Đang hiển thị kết quả tìm kiếm:", searchResults);
            return (
              <div className="search-results">
                <h3 className="search-results-title">Kết quả tìm kiếm ({searchResults.length})</h3>
                {searchResults.map((user) => {
                  console.log("Hiển thị người dùng:", user);
                  return (
                    <div key={user.user_id} className="contact-item" onClick={() => handleUserClick(user)}>
                      {renderAvatar(user)}
                      <div className="contact-info">
                        <div className="contact-name">{user.username}</div>
                      </div>
                      {isCurrentUser(user) ? (
                        <div className="current-user-label">
                          <i className="fas fa-user"></i>
                          Đây là bạn
                        </div>
                      ) : isUserLocked(user.user_id) ? (
                        <div className="locked-user-label">
                          <i className="fas fa-ban"></i>
                          Tài khoản bị khóa
                        </div>
                      ) : checkFriendshipStatus(user.user_id) === 'accepted' ? (
                        <div className="friend-status-label">
                          <i className="fas fa-user-check"></i>
                          Đã là bạn bè
                        </div>
                      ) : checkFriendshipStatus(user.user_id) === 'pending' ? (
                        <div className="pending-request-label">
                          <i className="fas fa-clock"></i>
                          Đã gửi lời mời
                        </div>
                      ) : (
                        <button 
                          className="add-friend-btn"
                          onClick={(e) => {
                            e.stopPropagation(); // Ngăn việc mở modal khi click vào nút kết bạn
                            handleUserClick(user); // Mở modal để gửi lời mời kết bạn
                          }}
                        >
                          <i className="fas fa-user-plus"></i>
                          Kết bạn
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()
        ) : activeTab === 'explore' && hasSearched && searchResults.length === 0 ? (
          <div className="contacts-empty">
            <div className="contacts-empty-icon"></div>
            <h3>Không tìm thấy người dùng</h3>
            <p>Không có người dùng nào phù hợp với tìm kiếm của bạn</p>
          </div>
        ) : (
          <div className="contacts-empty">
            <div className="contacts-empty-icon explore-icon"></div>
            <h3>Khám phá người dùng</h3>
            <p>Nhập tên hoặc email để tìm kiếm và kết bạn với người dùng mới</p>
          </div>
        )}
      </div>

      {/* User Profile Modal */}
      <UserProfileModal 
        isOpen={showUserProfileModal}
        onClose={handleCloseUserProfileModal}
        userId={selectedUserId}
        onFriendRequestSent={handleProfileModalUpdate}
        fromFriendRequest={JSON.parse(localStorage.getItem('currentFriendRequest') || '{"fromFriendRequest": false}').fromFriendRequest} 
        friendshipId={JSON.parse(localStorage.getItem('currentFriendRequest') || '{"friendshipId": null}').friendshipId}
      />

      <style>
        {`
          .friend-status-label, .pending-request-label, .current-user-label, .locked-user-label {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 500;
          }
          
          .friend-status-label {
            background-color: #e3f2fd;
            color: #2196f3;
          }
          
          .pending-request-label {
            background-color: #fff8e1;
            color: #ffa000;
          }
          
          .current-user-label {
            background-color: #f5f5f5;
            color: #607d8b;
          }
          
          .locked-user-label {
            background-color: #ffebee;
            color: #f44336;
          }
          
          .banned-avatar {
            background-color: #f44336 !important;
            color: white;
            font-weight: bold;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .status-banned {
            background-color: #f44336 !important;
          }
          
          .friend-request-avatar.banned-avatar {
            background-color: #f44336;
            color: white;
            font-weight: bold;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        `}
      </style>
    </div>
  );
};

export default ContactsContent; 