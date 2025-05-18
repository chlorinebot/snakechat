import React, { useState, useEffect } from 'react';
import './ProfileModal.css'; // Sử dụng lại CSS của ProfileModal
import api from '../../services/api';
import type { User } from '../../services/api';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: number;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, userId }) => {
  const [userData, setUserData] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [addingFriend, setAddingFriend] = useState<boolean>(false);
  const [friendRequestSent, setFriendRequestSent] = useState<boolean>(false);

  useEffect(() => {
    // Lấy thông tin người dùng hiện tại từ localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
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
          console.warn("Không có thông tin trạng thái cho người dùng:", userFromAPI);
          // Mặc định trạng thái là offline nếu không có
          userFromAPI.status = 'offline';
        }
        
        console.log("Thông tin người dùng từ API:", userFromAPI);
        setUserData(userFromAPI);
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

  const handleAddFriend = async () => {
    if (!userData || !currentUser) return;
    
    setAddingFriend(true);
    try {
      // TODO: Thêm API gửi lời mời kết bạn ở đây
      // await api.sendFriendRequest(userData.user_id);
      
      console.log(`Đã gửi lời mời kết bạn đến ${userData.username}`);
      setFriendRequestSent(true);
      
      setTimeout(() => {
        // Đóng modal sau khi gửi lời mời kết bạn thành công
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Lỗi khi gửi lời mời kết bạn:', error);
      setError('Không thể gửi lời mời kết bạn. Vui lòng thử lại sau.');
    } finally {
      setAddingFriend(false);
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
                join_date: userData.join_date
              });
              
              return (
                <div className="profile-content">
                  <div className="profile-avatar-section">
                    <div className="profile-avatar">
                      {userData.username ? userData.username.charAt(0).toUpperCase() : '?'}
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
                      <div className="info-label">Ngày tham gia:</div>
                      <div className="info-value">{formatDate(userData.join_date)}</div>
                    </div>
                    
                    {!isCurrentUser() && (
                      <button 
                        className="add-friend-button" 
                        onClick={handleAddFriend}
                        disabled={addingFriend || friendRequestSent}
                      >
                        <i className="fas fa-user-plus"></i>
                        {addingFriend ? 'Đang gửi...' : friendRequestSent ? 'Đã gửi lời mời' : 'Kết bạn'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="profile-error">Không thể tải thông tin người dùng</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal; 