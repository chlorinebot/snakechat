import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import type { User } from '../../services/api';
import UserProfileModal from './UserProfileModal';

interface ContactsContentProps {
  activeTab?: 'friends' | 'requests' | 'explore';
}

const ContactsContent: React.FC<ContactsContentProps> = ({ activeTab = 'friends' }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(undefined);
  const [showUserProfileModal, setShowUserProfileModal] = useState<boolean>(false);

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
    } catch (error) {
      console.error('Lỗi khi tìm kiếm người dùng:', error);
    } finally {
      setLoading(false);
    }
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
    
    console.log("So sánh người dùng:", {
      userEmail: user.email,
      currentUserEmail: currentUser.email,
      userUsername: user.username,
      currentUserUsername: currentUser.username,
      userId: user.user_id,
      currentUserId: currentUser.user_id
    });
    
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
  const handleUserClick = (user: User) => {
    setSelectedUserId(user.user_id);
    setShowUserProfileModal(true);
  };

  // Đóng modal
  const handleCloseUserProfileModal = () => {
    setShowUserProfileModal(false);
    setSelectedUserId(undefined);
  };

  return (
    <div className="contacts-content">
      {activeTab === 'friends' && (
        <div className="contacts-search-bar">
          <div className="search-icon"></div>
          <input 
            type="text" 
            placeholder="Tìm kiếm bạn bè..."
            className="contacts-search-input" 
          />
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
          <div className="contacts-empty">
            <div className="contacts-empty-icon"></div>
            <h3>Không có bạn bè nào</h3>
            <p>Danh sách bạn bè của bạn đang trống</p>
          </div>
        ) : activeTab === 'requests' ? (
          <div className="contacts-empty">
            <div className="contacts-empty-icon friend-request-icon"></div>
            <h3>Không có lời mời kết bạn</h3>
            <p>Bạn không có lời mời kết bạn nào</p>
          </div>
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
                      <div className="contact-avatar">
                        {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="contact-info">
                        <div className="contact-name">{user.username}</div>
                      </div>
                      {isCurrentUser(user) ? (
                        <div className="current-user-label">
                          <i className="fas fa-user"></i>
                          Đây là bạn
                        </div>
                      ) : (
                        <button 
                          className="add-friend-btn"
                          onClick={(e) => {
                            e.stopPropagation(); // Ngăn việc mở modal khi click vào nút kết bạn
                            // TODO: Thêm xử lý gửi lời mời kết bạn trực tiếp từ đây nếu cần
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
      />
    </div>
  );
};

export default ContactsContent; 