import React, { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import Sidebar from './Sidebar';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
  onLogout?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onLogout }) => {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');

  // Xác định nếu trình duyệt hỗ trợ chế độ tối mặc định
  const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  useEffect(() => {
    // Kiểm tra nếu đã có cài đặt trước đó trong localStorage
    const savedTheme = localStorage.getItem('darkMode');
    
    // Nếu chưa có cài đặt và trình duyệt ưa thích chế độ tối
    if (savedTheme === null && prefersDarkMode) {
      setDarkMode(true);
    } else if (savedTheme !== null) {
      setDarkMode(savedTheme === 'true');
    }
  }, [prefersDarkMode]);

  useEffect(() => {
    // Áp dụng chế độ theme khi component mount và khi darkMode thay đổi
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('darkMode', 'false');
    }

    // Thêm một chút độ trễ để đảm bảo các style được áp dụng đúng
    const applyStyles = setTimeout(() => {
      const forceReflow = document.body.offsetHeight;
    }, 50);

    return () => clearTimeout(applyStyles);
  }, [darkMode]);

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const handleLogout = () => {
    if (onLogout) {
      // Sử dụng hàm đăng xuất từ prop nếu được cung cấp
      onLogout();
    } else {
      // Fallback nếu không có hàm đăng xuất từ prop
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  };

  return (
    <div className={`app-container ${sidebarVisible ? 'sidebar-visible' : 'sidebar-hidden'}`}>
      <Sidebar />
      <div className="content-wrapper">
        <div className="content-header">
          <Button
            variant="light"
            className="sidebar-toggle"
            onClick={toggleSidebar}
          >
            <i className="fas fa-bars"></i>
          </Button>
          <div className="header-right">
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={darkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            >
              <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={handleLogout}
            >
              <i className="fas fa-sign-out-alt me-2"></i>
              Đăng xuất
            </Button>
          </div>
        </div>
        <div className="content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout; 