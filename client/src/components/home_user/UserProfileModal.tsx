import React, { useState, useEffect } from 'react';
import './ProfileModal.css'; // Sử dụng lại CSS của ProfileModal
import api from '../../services/api';
import type { User } from '../../services/api';
import ConfirmRemoveFriendModal from './ConfirmRemoveFriendModal';
import SuccessToast from '../common/SuccessToast';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: number;
  onFriendRequestSent?: () => void; // Callback khi gửi lời mời kết bạn thành công
  fromFriendRequest?: boolean; // Đánh dấu modal được mở từ lời mời kết bạn
  friendshipId?: number; // ID của lời mời kết bạn nếu có
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ 
  isOpen, 
  onClose, 
  userId, 
  onFriendRequestSent, 
  fromFriendRequest = false,
  friendshipId: propFriendshipId
}) => {
  const [userData, setUserData] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [addingFriend, setAddingFriend] = useState<boolean>(false);
  const [friendRequestSent, setFriendRequestSent] = useState<boolean>(false);
  const [friendshipStatus, setFriendshipStatus] = useState<string | null>(null);
  const [friendshipId, setFriendshipId] = useState<number | undefined>(propFriendshipId);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [removingFriend, setRemovingFriend] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [processingRequest, setProcessingRequest] = useState<boolean>(false);
  const [isUserLocked, setIsUserLocked] = useState<boolean>(false);
  const [lockInfo, setLockInfo] = useState<{reason: string, lock_time: string, unlock_time: string} | null>(null);

  useEffect(() => {
    // Lấy thông tin người dùng hiện tại từ localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
    
    // Cập nhật friendshipId từ prop nếu có
    if (propFriendshipId) {
      setFriendshipId(propFriendshipId);
    }
    
    // Đặt friendshipStatus thành 'pending' nếu mở từ lời mời kết bạn
    if (fromFriendRequest) {
      setFriendshipStatus('pending');
    }

    const fetchUserData = async () => {
      if (!isOpen || !userId) return;
      
      setLoading(true);
      try {
        // Luôn tải dữ liệu mới nhất từ API để đảm bảo thông tin cập nhật
        const users = await api.getUsers();
        const userFromAPI = users.find(u => u.user_id === userId);
        
        console.log("Tất cả người dùng từ API:", users);
        
        if (!userFromAPI) {
          console.error("Không tìm thấy người dùng với ID:", userId);
          setError('Không tìm thấy thông tin người dùng');
          setLoading(false);
          return;
        }
        
        // Kiểm tra dữ liệu người dùng
        if (!userFromAPI.email) {
          console.warn("Không có thông tin email cho người dùng:", userFromAPI);
        }
        
        if (!userFromAPI.status) {
          console.warn("Không có thông tin trạng thái hoạt động cho người dùng:", userFromAPI);
          // Mặc định trạng thái là offline nếu không có
          userFromAPI.status = 'offline';
        }
        
        console.log("Thông tin người dùng từ API:", userFromAPI);
        setUserData(userFromAPI);

        try {
          // Lấy thông tin từ bảng lock_users
          const response = await api.getUsers();
          const userWithLockInfo = response.find(u => u.user_id === userId);
          
          // Kiểm tra trạng thái khóa từ trường lock_status trong bảng
          const isLocked = userWithLockInfo?.lock_status === 'locked';
          
          console.log("Trạng thái khóa của tài khoản:", {
            userId: userId,
            username: userFromAPI.username,
            lockStatus: userWithLockInfo?.lock_status,
            isLocked: isLocked,
            hasLockID: !!userWithLockInfo?.lock_id
          });
          
          if (isLocked) {
            setIsUserLocked(true);
            
            // Lấy thông tin khóa từ dữ liệu người dùng
            setLockInfo({
              reason: userWithLockInfo?.reason || 'Không xác định',
              lock_time: userWithLockInfo?.lock_time || new Date().toISOString(),
              unlock_time: userWithLockInfo?.unlock_time || new Date().toISOString()
            });
          } else {
            // Đảm bảo trạng thái không bị khóa nếu status là 'unlocked' hoặc trạng thái khác
            setIsUserLocked(false);
            setLockInfo(null);
          }
        } catch (error) {
          console.error("Lỗi khi kiểm tra trạng thái khóa:", error);
          // Mặc định là không bị khóa nếu có lỗi
          setIsUserLocked(false);
          setLockInfo(null);
        }

        // Kiểm tra trạng thái kết bạn
        if (storedUser) {
          const currentUserData = JSON.parse(storedUser);
          const status = await api.checkFriendshipStatus(currentUserData.user_id, userId);
          console.log("Trạng thái kết bạn:", status);
          setFriendshipStatus(status.status);
          setFriendshipId(status.friendship_id);
          
          if (status.status === 'pending') {
            // Nếu đã gửi lời mời kết bạn trước đó
            setFriendRequestSent(true);
          }
        }
      } catch (error) {
        console.error('Lỗi khi lấy thông tin người dùng:', error);
        setError('Không thể tải thông tin người dùng. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [isOpen, userId]);

  // Kiểm tra xem user có phải là người dùng hiện tại không
  const isCurrentUser = () => {
    if (!currentUser || !userData) return false;
    
    // Kiểm tra xác thực bằng email (cách chính xác nhất)
    if (userData.email && currentUser.email && userData.email === currentUser.email) {
      return true;
    }
    
    // Kiểm tra bằng username nếu email không có hoặc không khớp
    if (userData.username && currentUser.username && userData.username === currentUser.username) {
      return true;
    }
    
    // Kiểm tra bằng ID nếu có
    if (userData.user_id && currentUser.user_id && userData.user_id === currentUser.user_id) {
      return true;
    }
    
    // Nếu tất cả đều không khớp
    return false;
  };

  // Kiểm tra xem có quyền xem trạng thái không
  const canViewStatus = () => {
    // Người dùng có thể xem trạng thái nếu:
    return isCurrentUser() || // Là chính bản thân
      friendshipStatus === 'accepted'; // Đã là bạn bè
  };

  // Hiển thị trạng thái hoạt động phù hợp
  const getStatusDisplay = () => {
    if (isUserLocked) {
      return 'Tài khoản bị khóa';
    }
    
    if (!canViewStatus()) {
      return 'Không có quyền xem';
    }
    
    return isOnline(userData?.status) ? 'Đang hoạt động' : 'Không hoạt động';
  };

  // Lấy lớp CSS cho chỉ báo trạng thái
  const getStatusIndicatorClass = () => {
    if (isUserLocked) {
      return 'status-banned';
    }
    
    if (!canViewStatus()) {
      return 'status-unknown'; // CSS đặc biệt cho trường hợp không có quyền xem
    }
    
    return isOnline(userData?.status) ? 'status-online' : 'status-offline';
  };

  // Trả về lớp CSS cho avatar
  const getAvatarClass = () => {
    return isUserLocked ? 'profile-avatar banned-avatar' : 'profile-avatar';
  };

  const handleAddFriend = async () => {
    if (!userData || !currentUser) return;
    
    // Đảm bảo cả hai user_id đều tồn tại
    if (!userData.user_id || !currentUser.user_id) {
      setError('Không thể gửi lời mời: Thiếu thông tin người dùng');
      return;
    }
    
    setAddingFriend(true);
    try {
      // Gửi lời mời kết bạn
      const result = await api.sendFriendRequest(currentUser.user_id, userData.user_id);
      
      if (result.success) {
        console.log(`Đã gửi lời mời kết bạn đến ${userData.username}`);
        setFriendRequestSent(true);
        setFriendshipStatus('pending');
        setFriendshipId(result.data?.friendship_id);
        
        // Gọi callback nếu có
        if (onFriendRequestSent) {
          onFriendRequestSent();
        }
        
        setTimeout(() => {
          // Đóng modal sau khi gửi lời mời kết bạn thành công
          onClose();
        }, 1500);
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('Lỗi khi gửi lời mời kết bạn:', error);
      setError('Không thể gửi lời mời kết bạn. Vui lòng thử lại sau.');
    } finally {
      setAddingFriend(false);
    }
  };

  const handleCancelFriendRequest = async () => {
    if (!friendshipId) {
      console.error('Không thể hủy lời mời kết bạn: friendshipId không tồn tại');
      return;
    }
    
    setAddingFriend(true);
    try {
      // Hủy lời mời kết bạn, sử dụng non-null assertion để khắc phục TypeScript error
      const result = await api.rejectFriendRequest(friendshipId as number);
      
      if (result.success) {
        console.log('Đã hủy lời mời kết bạn');
        setFriendRequestSent(false);
        setFriendshipStatus(null);
        setFriendshipId(undefined);
        
        setTimeout(() => {
          // Đóng modal sau khi hủy lời mời kết bạn thành công
          onClose();
        }, 1500);
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('Lỗi khi hủy lời mời kết bạn:', error);
      setError('Không thể hủy lời mời kết bạn. Vui lòng thử lại sau.');
    } finally {
      setAddingFriend(false);
    }
  };
  
  // Xử lý khi người dùng nhấn nút hủy kết bạn
  const handleRemoveFriendClick = () => {
    setShowConfirmModal(true); // Hiển thị modal xác nhận
  };
  
  // Xử lý khi người dùng xác nhận hủy kết bạn
  const handleRemoveFriend = async () => {
    if (!friendshipId) {
      console.error('Không thể hủy kết bạn: friendshipId không tồn tại');
      setShowConfirmModal(false);
      return;
    }
    
    setRemovingFriend(true);
    try {
      // Gọi API hủy kết bạn
      const result = await api.removeFriend(friendshipId);
      
      if (result.success) {
        console.log('Đã hủy kết bạn thành công');
        setSuccessMessage('Đã hủy kết bạn thành công!');
        setFriendshipStatus(null);
        setFriendshipId(undefined);
        
        // Gọi callback nếu có
        if (onFriendRequestSent) {
          onFriendRequestSent();
        }
        
        // Đóng modal xác nhận ngay lập tức nhưng giữ lại modal thông tin người dùng
        setShowConfirmModal(false);
        
        // Đóng modal thông tin người dùng sau khi hết thời gian hiển thị thông báo
        setTimeout(() => {
          // Xóa thông báo thành công và đóng modal
          setSuccessMessage('');
          onClose();
        }, 3000);
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('Lỗi khi hủy kết bạn:', error);
      setError('Không thể hủy kết bạn. Vui lòng thử lại sau.');
    } finally {
      setRemovingFriend(false);
      setShowConfirmModal(false); // Đóng modal xác nhận
    }
  };
  
  // Đóng modal xác nhận
  const handleCancelRemove = () => {
    setShowConfirmModal(false);
  };

  // Xử lý khi chấp nhận lời mời kết bạn
  const handleAcceptFriendRequest = async () => {
    if (!friendshipId) {
      console.error('Không thể chấp nhận lời mời kết bạn: friendshipId không tồn tại');
      return;
    }
    
    setProcessingRequest(true);
    try {
      const result = await api.acceptFriendRequest(friendshipId);
      
      if (result.success) {
        console.log('Đã chấp nhận lời mời kết bạn');
        setSuccessMessage('Đã chấp nhận lời mời kết bạn!');
        setFriendshipStatus('accepted');
        
        // Gọi callback nếu có
        if (onFriendRequestSent) {
          onFriendRequestSent();
        }
        
        setTimeout(() => {
          setSuccessMessage('');
          onClose();
        }, 2000);
      } else {
        setError(result.message);
      }
    } catch (error: any) {
      console.error('Lỗi khi chấp nhận lời mời kết bạn:', error);
      setError('Không thể chấp nhận lời mời. Vui lòng thử lại sau.');
    } finally {
      setProcessingRequest(false);
    }
  };
  
  // Xử lý khi từ chối lời mời kết bạn
  const handleRejectFriendRequest = async () => {
    if (!friendshipId) {
      console.error('Không thể từ chối lời mời kết bạn: friendshipId không tồn tại');
      return;
    }
    
    setProcessingRequest(true);
    try {
      const result = await api.rejectFriendRequest(friendshipId);
      
      if (result.success) {
        console.log('Đã từ chối lời mời kết bạn');
        setSuccessMessage('Đã từ chối lời mời kết bạn!');
        setFriendshipStatus(null);
        setFriendshipId(undefined);
        
        // Gọi callback nếu có
        if (onFriendRequestSent) {
          onFriendRequestSent();
        }
        
        setTimeout(() => {
          setSuccessMessage('');
          onClose();
        }, 2000);
      } else {
        setError(result.message);
      }
    } catch (error: any) {
      console.error('Lỗi khi từ chối lời mời kết bạn:', error);
      setError('Không thể từ chối lời mời. Vui lòng thử lại sau.');
    } finally {
      setProcessingRequest(false);
    }
  };

  if (!isOpen) return null;

  // Format ngày thành dd/mm/yyyy
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      // Kiểm tra xem ngày có hợp lệ không
      if (isNaN(date.getTime())) return 'N/A';
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    } catch (error) {
      console.error('Lỗi khi format date:', error);
      return 'N/A';
    }
  };

  // Kiểm tra trạng thái online
  const isOnline = (status?: string) => {
    console.log('Kiểm tra trạng thái profile modal:', status);
    if (status === undefined || status === null) {
      return false;
    }
    return status.toLowerCase() === 'online';
  };

  // Tính toán thời gian hoạt động cuối cùng
  const getLastActivityTime = (lastActivity?: string) => {
    if (!lastActivity) return 'N/A';
    try {
      const date = new Date(lastActivity);
      // Kiểm tra xem ngày có hợp lệ không
      if (isNaN(date.getTime())) return 'N/A';
      
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
      console.error('Lỗi khi tính thời gian hoạt động cuối cùng:', error);
      return 'N/A';
    }
  };

  // Render button dựa trên trạng thái kết bạn
  const renderFriendshipButton = () => {
    if (isCurrentUser()) {
      return null; // Không hiển thị nút nếu là chính mình
    }

    // Không hiển thị nút kết bạn thông thường cho người dùng bị khóa
    if (isUserLocked) {
      return null; 
    }

    if (friendshipStatus === 'accepted') {
      return (
        <div className="friendship-actions">
          <div className="main-actions">
            <button 
              className="message-friend-button"
              onClick={() => {
                console.log("Mở cuộc trò chuyện với:", userData?.username);
                // Đóng modal thông tin người dùng trước khi chuyển sang tab tin nhắn
                onClose();
                // Chức năng mở cuộc trò chuyện sẽ được triển khai sau
                // Có thể xử lý việc chuyển tab và mở cuộc trò chuyện ở đây
              }}
            >
              <i className="fas fa-comment"></i>
              Nhắn tin
            </button>
          </div>
          
          <div className="secondary-actions">
            <span className="friend-status">
              <i className="fas fa-user-check"></i>
              Đã là bạn bè
            </span>
            <button 
              className="remove-friend-button" 
              onClick={handleRemoveFriendClick}
            >
              <i className="fas fa-user-minus"></i>
              Hủy kết bạn
            </button>
          </div>
        </div>
      );
    } else if (friendshipStatus === 'pending' && friendRequestSent) {
      return (
        <button 
          className="cancel-friend-button" 
          onClick={handleCancelFriendRequest}
          disabled={addingFriend}
        >
          <i className="fas fa-user-times"></i>
          {addingFriend ? 'Đang hủy...' : 'Hủy lời mời kết bạn'}
        </button>
      );
    } else if (friendshipStatus === 'pending' && fromFriendRequest) {
      // Thêm UI cho trường hợp nhận được lời mời kết bạn
      return (
        <div className="friendship-request-buttons">
          <button 
            className="accept-friend-button" 
            onClick={handleAcceptFriendRequest}
            disabled={processingRequest}
          >
            <i className="fas fa-user-check"></i>
            {processingRequest ? 'Đang xử lý...' : 'Chấp nhận'}
          </button>
          <button 
            className="reject-friend-button" 
            onClick={handleRejectFriendRequest}
            disabled={processingRequest}
          >
            <i className="fas fa-user-times"></i>
            {processingRequest ? 'Đang xử lý...' : 'Từ chối'}
          </button>
        </div>
      );
    } else {
      return (
        <button 
          className="add-friend-button" 
          onClick={handleAddFriend}
          disabled={addingFriend || friendRequestSent}
        >
          <i className="fas fa-user-plus"></i>
          {addingFriend ? 'Đang gửi...' : friendRequestSent ? 'Đã gửi lời mời' : 'Kết bạn'}
        </button>
      );
    }
  };

  // Render nút hủy kết bạn cho người dùng bị khóa (nếu đã là bạn bè)
  const renderLockedUserActions = () => {
    if (!isUserLocked || isCurrentUser()) return null;
    
    if (friendshipStatus === 'accepted') {
      return (
        <div className="friendship-actions">
          <div className="secondary-actions">
            <span className="friend-status locked-status">
              <i className="fas fa-user-lock"></i>
              Tài khoản bị khóa
            </span>
            <button 
              className="remove-friend-button" 
              onClick={handleRemoveFriendClick}
            >
              <i className="fas fa-user-minus"></i>
              Hủy kết bạn
            </button>
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="profile-modal-overlay">
      <div className="profile-modal">
        <div className="profile-modal-header">
          <h2>Thông tin người dùng</h2>
          <button className="close-button" onClick={onClose}></button>
        </div>
        <div className="profile-modal-content">
          {loading ? (
            <div className="profile-loading">Đang tải thông tin...</div>
          ) : userData ? (
            (() => {
              // Ghi log cho việc gỡ lỗi
              console.log("Render UserProfileModal với thông tin:", {
                email: userData.email,
                status: userData.status,
                join_date: userData.join_date,
                friendshipStatus,
                isUserLocked
              });
              
              return (
                <div className="profile-content">
                  <div className="profile-avatar-section">
                    <div className={getAvatarClass()}>
                      {isUserLocked ? 'BAN' : userData.username ? userData.username.charAt(0).toUpperCase() : '?'}
                      <div className={`profile-status-indicator ${getStatusIndicatorClass()}`}></div>
                    </div>
                    <div className="profile-user-info">
                      <div className="profile-username">{userData.username}</div>
                    </div>
                  </div>
                  
                  <div className="profile-info">
                    {error && <div className="profile-error">{error}</div>}
                    {friendRequestSent && (
                      <div className="profile-success">Đã gửi lời mời kết bạn thành công!</div>
                    )}
                    
                    <div className="info-group">
                      <div className="info-label">Tên người dùng:</div>
                      <div className="info-value">{userData.username}</div>
                    </div>
                    
                    <div className="info-group">
                      <div className="info-label">Trạng thái:</div>
                      <div className="info-value">{getStatusDisplay()}</div>
                    </div>
                    
                    {isUserLocked && lockInfo && (
                      <div className="locked-account-info">
                        <div className="info-group">
                          <div className="info-label">Thời gian khóa:</div>
                          <div className="info-value">{formatDate(lockInfo.lock_time)}</div>
                        </div>
                      </div>
                    )}
                    
                    {canViewStatus() && !isOnline(userData.status) && userData.last_activity && !isUserLocked && (
                      <div className="info-group">
                        <div className="info-label">Hoạt động cuối:</div>
                        <div className="info-value">{getLastActivityTime(userData.last_activity)}</div>
                      </div>
                    )}
                    
                    <div className="info-group">
                      <div className="info-label">Ngày tham gia:</div>
                      <div className="info-value">{formatDate(userData.join_date)}</div>
                    </div>
                    
                    {renderFriendshipButton()}
                    {renderLockedUserActions()}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="profile-error">Không thể tải thông tin người dùng</div>
          )}
        </div>
        
        {/* Sử dụng component modal xác nhận hủy kết bạn */}
        <ConfirmRemoveFriendModal 
          isOpen={showConfirmModal}
          username={userData?.username}
          isProcessing={removingFriend}
          onConfirm={handleRemoveFriend}
          onCancel={handleCancelRemove}
        />
      </div>
      
      {/* Hiển thị thông báo toast thành công */}
      {successMessage && (
        <SuccessToast 
          message={successMessage} 
          duration={3000}
        />
      )}

      <style>
        {`
        .friendship-request-buttons {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }
        
        .accept-friend-button, .reject-friend-button {
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background-color 0.2s;
        }
        
        .accept-friend-button {
          background-color: #4CAF50;
          color: white;
        }
        
        .accept-friend-button:hover {
          background-color: #3e8e41;
        }
        
        .reject-friend-button {
          background-color: #f44336;
          color: white;
        }
        
        .reject-friend-button:hover {
          background-color: #d32f2f;
        }
        
        .accept-friend-button:disabled, .reject-friend-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .friendship-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 20px;
        }
        
        .main-actions {
          width: 100%;
        }
        
        .secondary-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .friend-status {
          font-size: 14px;
          color: #666;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .friend-status i {
          color: #4CAF50;
          font-size: 12px;
        }
        
        .locked-status {
          color: #d32f2f;
        }
        
        .locked-status i {
          color: #d32f2f;
        }
        
        .message-friend-button {
          padding: 12px 15px;
          border-radius: 5px;
          background-color: #0066ff;
          color: white;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background-color 0.2s ease;
          width: 100%;
        }
        
        .message-friend-button:hover {
          background-color: #0052cc;
        }
        
        .message-friend-button i {
          font-size: 14px;
        }
        
        .remove-friend-button {
          padding: 6px 10px;
          border-radius: 5px;
          background-color: transparent;
          color: #666;
          border: 1px solid #ddd;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
        }
        
        .remove-friend-button:hover {
          background-color: #f8f8f8;
          color: #d32f2f;
          border-color: #f0f0f0;
        }
        
        .remove-friend-button i {
          font-size: 11px;
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
        
        .locked-account-info {
          margin-top: 10px;
          padding: 10px;
          border-radius: 6px;
          background-color: rgba(244, 67, 54, 0.1);
          border: 1px solid rgba(244, 67, 54, 0.3);
        }
        
        .lock-reason {
          color: #d32f2f;
          font-weight: 500;
        }
        
        .locked-user-actions {
          margin-top: 20px;
          border-top: 1px solid #e0e0e0;
          padding-top: 20px;
        }
        
        .full-width {
          width: 100%;
          padding: 10px;
          justify-content: center;
        }
        `}
      </style>
    </div>
  );
};

export default UserProfileModal; 