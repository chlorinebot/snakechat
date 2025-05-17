import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/admin/Dashboard';
import Users from './pages/admin/Users';
import Roles from './pages/admin/Roles';
import LockedAccounts from './pages/admin/LockedAccounts';
import api from './services/api';

// URL endpoint cho cập nhật trạng thái
const API_URL = 'http://localhost:5000/api';
const OFFLINE_URL = `${API_URL}/user/update-status-beacon`;
const HEARTBEAT_INTERVAL = 30000; // 30 giây

const App: React.FC = () => {
  // Kiểm tra authentication và role từ localStorage
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(localStorage.getItem('token') !== null);
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('user') || '{}'));
  const isAdmin = user.role_id === 1;
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isTabActive, setIsTabActive] = useState<boolean>(document.visibilityState === 'visible');

  // Hàm cập nhật thời gian hoạt động cuối cùng
  const updateLastActivityTime = () => {
    const now = new Date().getTime();
    localStorage.setItem('lastActivity', now.toString());
  };

  // Thêm sự kiện để cập nhật trạng thái online
  const updateOnlineStatus = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        // Kiểm tra cả id và user_id
        const userId = parsedUser.user_id || parsedUser.id;
        if (userId) {
          api.updateUserActivity(userId);
          // Cập nhật thời gian hoạt động cuối cùng
          updateLastActivityTime();
        }
      } catch (error) {
        console.error('Lỗi khi parse user data trong updateOnlineStatus:', error);
      }
    }
  };

  // Hàm gửi heartbeat để xác nhận người dùng vẫn đang sử dụng hệ thống
  const sendHeartbeat = () => {
    if (!isTabActive) return; // Không gửi heartbeat nếu tab không hoạt động
    
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        const userId = parsedUser.user_id || parsedUser.id;
        if (userId) {
          api.sendHeartbeat(userId);
          updateLastActivityTime();
        }
      } catch (error) {
        console.error('Lỗi khi gửi heartbeat:', error);
      }
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
          await api.updateUserOffline(userId);
        }
      } catch (error) {
        console.error('Lỗi khi parse user data trong handleUserOffline:', error);
      }
    }
  };

  // Hàm sử dụng Beacon API để gửi trạng thái offline khi đóng tab
  const sendOfflineBeacon = () => {
    const userData = localStorage.getItem('user');
    if (userData && navigator.sendBeacon) {
      try {
        const parsedUser = JSON.parse(userData);
        const userId = parsedUser.user_id || parsedUser.id;
        if (userId) {
          const data = new FormData();
          data.append('user_id', userId.toString());
          data.append('status', 'offline');
          
          // Sử dụng navigator.sendBeacon để đảm bảo yêu cầu được gửi ngay cả khi đóng tab
          const beaconSent = navigator.sendBeacon(OFFLINE_URL, data);
          console.log('Đã gửi beacon offline:', beaconSent);
          return beaconSent;
        }
      } catch (error) {
        console.error('Lỗi khi gửi beacon:', error);
      }
    }
    return false;
  };

  // Kiểm tra xem người dùng có hoạt động trong khoảng thời gian quy định không
  const checkUserActivity = () => {
    const lastActivity = localStorage.getItem('lastActivity');
    if (lastActivity) {
      const now = new Date().getTime();
      const lastActiveTime = parseInt(lastActivity, 10);
      const inactiveTime = now - lastActiveTime;
      
      // Nếu không hoạt động trong 5 phút (300000ms), đánh dấu là offline
      if (inactiveTime > 300000) {
        handleUserOffline();
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    // Khởi tạo thời gian hoạt động cuối cùng
    updateLastActivityTime();
    
    // Kiểm tra token khi component mount
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    setIsAuthenticated(token !== null);
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Cập nhật trạng thái online nếu người dùng đã đăng nhập
        // Kiểm tra cả id và user_id
        const userId = parsedUser.user_id || parsedUser.id;
        if (userId) {
          api.updateUserActivity(userId);
          updateLastActivityTime();
        }
      } catch (error) {
        console.error('Lỗi khi parse thông tin user từ localStorage:', error);
      }
    }
    
    // Thiết lập interval để cập nhật trạng thái online
    const intervalId = setInterval(() => {
      // Chỉ cập nhật nếu người dùng vẫn hoạt động
      if (checkUserActivity()) {
        updateOnlineStatus();
      }
    }, 30000); // Cập nhật mỗi 30 giây
    
    // Thiết lập interval cho heartbeat
    heartbeatTimerRef.current = setInterval(() => {
      sendHeartbeat();
    }, HEARTBEAT_INTERVAL);
    
    // Thiết lập interval để kiểm tra định kỳ sự hoạt động của người dùng
    const activityCheckId = setInterval(() => {
      checkUserActivity();
    }, 60000); // Kiểm tra mỗi phút
    
    // Xử lý sự kiện khi người dùng đóng tab/trình duyệt
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      console.log('Sự kiện beforeunload đã được kích hoạt');
      
      // Thêm message để trình duyệt hiển thị hộp thoại xác nhận
      event.preventDefault();
      event.returnValue = '';
      
      // Sử dụng Beacon API để đảm bảo yêu cầu được gửi
      if (!sendOfflineBeacon()) {
        // Fallback nếu sendBeacon không được hỗ trợ
        handleUserOffline();
      }
      
      // Xóa message sau khi đã gửi beacon
      delete event.returnValue;
    };
    
    // Thêm sự kiện unload để đảm bảo hơn nữa
    const handleUnload = () => {
      console.log('Sự kiện unload đã được kích hoạt');
      
      // Sử dụng Beacon API để đảm bảo yêu cầu được gửi
      if (!sendOfflineBeacon()) {
        // Fallback nếu sendBeacon không được hỗ trợ
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_URL}/user/update-status`, false); // Đặt false để làm cho nó đồng bộ
        xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
        
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const parsedUser = JSON.parse(userData);
            const userId = parsedUser.user_id || parsedUser.id;
            if (userId) {
              xhr.send(JSON.stringify({ user_id: userId, status: 'offline' }));
            }
          } catch (error) {
            console.error('Lỗi khi gửi yêu cầu offline:', error);
          }
        }
      }
    };
    
    // Xử lý sự kiện khi mất kết nối internet
    const handleOffline = () => {
      handleUserOffline();
    };
    
    // Xử lý sự kiện khi có kết nối internet trở lại
    const handleOnline = () => {
      updateOnlineStatus();
    };
    
    // Xử lý sự kiện khi tab không còn hiển thị
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      setIsTabActive(isVisible);
      
      if (!isVisible) {
        // Tab không còn hiển thị
        localStorage.setItem('tabHiddenTime', new Date().getTime().toString());
        
        // Dừng heartbeat khi tab không hiển thị
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = null;
        }
      } else {
        // Tab hiển thị lại
        const hiddenTime = localStorage.getItem('tabHiddenTime');
        if (hiddenTime) {
          const now = new Date().getTime();
          const hiddenDuration = now - parseInt(hiddenTime, 10);
          
          // Nếu tab đã ẩn hơn 5 phút, cập nhật lại trạng thái online
          if (hiddenDuration > 300000) {
            updateOnlineStatus();
          }
        }
        
        // Khởi động lại heartbeat khi tab hiển thị lại
        if (!heartbeatTimerRef.current) {
          heartbeatTimerRef.current = setInterval(() => {
            sendHeartbeat();
          }, HEARTBEAT_INTERVAL);
        }
        
        // Cập nhật lại thời gian hoạt động
        updateLastActivityTime();
        updateOnlineStatus();
      }
    };
    
    // Theo dõi hoạt động người dùng trên trang
    const handleUserActivity = () => {
      updateOnlineStatus();
      updateLastActivityTime();
    };
    
    // Đăng ký các sự kiện
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Theo dõi các sự kiện tương tác của người dùng
    document.addEventListener('click', handleUserActivity);
    document.addEventListener('scroll', handleUserActivity);
    
    return () => {
      // Xóa đăng ký sự kiện và dừng interval khi component unmount
      clearInterval(intervalId);
      clearInterval(activityCheckId);
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
    localStorage.removeItem('lastActivity');
    localStorage.removeItem('tabHiddenTime');
    
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