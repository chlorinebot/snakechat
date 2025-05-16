import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/admin/Dashboard';
import Users from './pages/admin/Users';
import Roles from './pages/admin/Roles';
import LockedAccounts from './pages/admin/LockedAccounts';
import api from './services/api';

const App: React.FC = () => {
  // Kiểm tra authentication và role từ localStorage
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(localStorage.getItem('token') !== null);
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('user') || '{}'));
  const isAdmin = user.role_id === 1;

  // Thêm sự kiện để cập nhật trạng thái online
  const updateOnlineStatus = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      if (parsedUser && parsedUser.user_id) {
        api.updateUserActivity(parsedUser.user_id);
      }
    }
  };

  // Hàm cập nhật trạng thái offline khi người dùng thoát
  const handleUserOffline = async () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      if (parsedUser && parsedUser.user_id) {
        await api.updateUserOffline(parsedUser.user_id);
      }
    }
  };

  useEffect(() => {
    // Kiểm tra token khi component mount
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    setIsAuthenticated(token !== null);
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // Cập nhật trạng thái online nếu người dùng đã đăng nhập
      if (parsedUser && parsedUser.user_id) {
        api.updateUserActivity(parsedUser.user_id);
      }
    }
    
    // Thiết lập interval để cập nhật trạng thái online
    const intervalId = setInterval(() => {
      updateOnlineStatus();
    }, 30000); // Cập nhật mỗi 30 giây
    
    // Xử lý sự kiện khi người dùng đóng tab/trình duyệt
    const handleBeforeUnload = () => {
      handleUserOffline();
    };
    
    // Xử lý sự kiện khi mất kết nối internet
    const handleOffline = () => {
      handleUserOffline();
    };
    
    // Theo dõi hoạt động người dùng trên trang
    const handleUserActivity = () => {
      updateOnlineStatus();
    };
    
    // Đăng ký các sự kiện
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('offline', handleOffline);
    
    // Theo dõi các sự kiện tương tác của người dùng
    document.addEventListener('click', handleUserActivity);
    document.addEventListener('keypress', handleUserActivity);
    document.addEventListener('scroll', handleUserActivity);
    
    return () => {
      // Xóa đăng ký sự kiện và dừng interval khi component unmount
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('click', handleUserActivity);
      document.removeEventListener('keypress', handleUserActivity);
      document.removeEventListener('scroll', handleUserActivity);
      
      // Cập nhật trạng thái offline khi unmount
      handleUserOffline();
    };
  }, []);

  // Xử lý đăng xuất
  const handleLogout = async () => {
    // Cập nhật trạng thái offline trước khi đăng xuất
    await handleUserOffline();
    
    // Xóa thông tin đăng nhập khỏi localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Cập nhật state
    setIsAuthenticated(false);
    setUser({});
  };

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!isAuthenticated ? <Login /> : <Navigate to={isAdmin ? "/dashboard" : "/user-home"} />} 
        />
        <Route 
          path="/register" 
          element={!isAuthenticated ? <Register /> : <Navigate to={isAdmin ? "/dashboard" : "/user-home"} />} 
        />
        <Route 
          path="/dashboard" 
          element={isAuthenticated && isAdmin ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/users" 
          element={isAuthenticated && isAdmin ? <Users onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/roles" 
          element={isAuthenticated && isAdmin ? <Roles onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/locked-accounts" 
          element={isAuthenticated && isAdmin ? <LockedAccounts onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/settings" 
          element={isAuthenticated && isAdmin ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/logs" 
          element={isAuthenticated && isAdmin ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/user-home" 
          element={isAuthenticated && !isAdmin ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/" 
          element={<Navigate to={isAuthenticated ? (isAdmin ? "/dashboard" : "/user-home") : "/login"} />} 
        />
      </Routes>
    </Router>
  );
};

export default App;