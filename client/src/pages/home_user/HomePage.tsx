import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';
import api from '../../services/api';

interface UserProps {
  onLogout: () => void;
}

const HomePage: React.FC<UserProps> = ({ onLogout }) => {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  
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
  }, [navigate]);

  const handleLogoutClick = () => {
    onLogout();
    navigate('/login');
  };

  if (!user) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <div className="user-home-container">
      <header className="user-home-header">
        <div className="user-home-logo">SnakeChat</div>
        <div className="user-home-profile">
          <span className="user-home-username">{user.username}</span>
          <button className="user-home-logout-btn" onClick={handleLogoutClick}>
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="user-home-content">
        <div className="welcome-section">
          <h1>Chào mừng, {user.username}!</h1>
          <p>Đây là trang chủ dành cho người dùng thường.</p>
        </div>

        <div className="user-home-dashboard">
          <div className="dashboard-card">
            <h2>Tin nhắn</h2>
            <p>Bạn có 0 tin nhắn mới</p>
            <button className="dashboard-card-button">Xem tin nhắn</button>
          </div>
          
          <div className="dashboard-card">
            <h2>Người dùng trực tuyến</h2>
            <p>Có 0 người dùng đang trực tuyến</p>
            <button className="dashboard-card-button">Xem danh sách</button>
          </div>
          
          <div className="dashboard-card">
            <h2>Cài đặt cá nhân</h2>
            <p>Cập nhật thông tin tài khoản</p>
            <button className="dashboard-card-button">Chỉnh sửa</button>
          </div>
        </div>
      </main>

      <footer className="user-home-footer">
        <p>&copy; 2025 SnakeChat - Trang chủ Người dùng</p>
      </footer>
    </div>
  );
};

export default HomePage; 