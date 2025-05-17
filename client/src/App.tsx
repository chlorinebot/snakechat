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
      try {
        const parsedUser = JSON.parse(userData);
        // Kiểm tra cả id và user_id
        const userId = parsedUser.user_id || parsedUser.id;
        if (userId) {
          console.log('Cập nhật trạng thái online định kỳ cho user:', userId);
          api.updateUserActivity(userId);
        } else {
          console.error('Không tìm thấy user_id hoặc id trong dữ liệu:', parsedUser);
        }
      } catch (error) {
        console.error('Lỗi khi parse user data trong updateOnlineStatus:', error);
      }
    } else {
      console.log('Không có dữ liệu người dùng trong localStorage');
    }
  };

  // Hàm cập nhật trạng thái offline khi người dùng thoát
  const handleUserOffline = async () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        // Kiểm tra cả id và user_id
        const userId = parsedUser.user_id || parsedUser.id;
        if (userId) {
          console.log('Đang cập nhật trạng thái offline cho user:', userId);
          await api.updateUserOffline(userId);
        } else {
          console.error('Không tìm thấy user_id hoặc id trong dữ liệu:', parsedUser);
        }
      } catch (error) {
        console.error('Lỗi khi parse user data trong handleUserOffline:', error);
      }
    } else {
      console.log('Không có dữ liệu người dùng để cập nhật offline');
    }
  };

  useEffect(() => {
    // Kiểm tra token khi component mount
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    console.log('App khởi động - Đang kiểm tra thông tin người dùng...', { token: !!token });
    
    setIsAuthenticated(token !== null);
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        console.log('Thông tin người dùng từ localStorage:', parsedUser);
        setUser(parsedUser);
        
        // Cập nhật trạng thái online nếu người dùng đã đăng nhập
        // Kiểm tra cả id và user_id
        const userId = parsedUser.user_id || parsedUser.id;
        if (userId) {
          console.log('Đã xác định được id người dùng, đang cập nhật trạng thái online:', userId);
          api.updateUserActivity(userId);
        } else {
          console.error('Không tìm thấy user_id hoặc id trong localStorage:', parsedUser);
        }
      } catch (error) {
        console.error('Lỗi khi parse thông tin user từ localStorage:', error);
      }
    } else {
      console.log('Không tìm thấy thông tin người dùng trong localStorage');
    }
    
    // Thiết lập interval để cập nhật trạng thái online
    const intervalId = setInterval(() => {
      updateOnlineStatus();
    }, 30000); // Cập nhật mỗi 30 giây
    
    // Xử lý sự kiện khi người dùng đóng tab/trình duyệt
    const handleBeforeUnload = () => {
      console.log('Người dùng đang đóng tab/trình duyệt - cập nhật offline');
      handleUserOffline();
    };
    
    // Xử lý sự kiện khi mất kết nối internet
    const handleOffline = () => {
      console.log('Mất kết nối internet - cập nhật offline');
      handleUserOffline();
    };
    
    // Theo dõi hoạt động người dùng trên trang
    const handleUserActivity = () => {
      console.log('Cập nhật trạng thái online đính kỳ cho user: chỉ theo dõi khi click hoặc cuộn trang');
      updateOnlineStatus();
    };
    
    // Đăng ký các sự kiện
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('offline', handleOffline);
    
    // Theo dõi các sự kiện tương tác của người dùng
    document.addEventListener('click', handleUserActivity);
    document.addEventListener('scroll', handleUserActivity);
    
    return () => {
      // Xóa đăng ký sự kiện và dừng interval khi component unmount
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('click', handleUserActivity);
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