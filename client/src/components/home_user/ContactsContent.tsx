import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import type { User } from '../../services/api';

interface ContactsContentProps {
  activeTab?: 'friends' | 'requests' | 'explore';
}

const ContactsContent: React.FC<ContactsContentProps> = ({ activeTab = 'friends' }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

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
          <div className="search-results">
            <h3 className="search-results-title">Kết quả tìm kiếm ({searchResults.length})</h3>
            {searchResults.map((user) => (
              <div key={user.user_id} className="contact-item">
                <div className="contact-avatar">
                  {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="contact-info">
                  <div className="contact-name">{user.username}</div>
                  <div className="contact-email">{user.email}</div>
                </div>
                <button className="add-friend-btn">
                  <i className="fas fa-user-plus"></i>
                  Kết bạn
                </button>
              </div>
            ))}
          </div>
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
    </div>
  );
};

export default ContactsContent; 