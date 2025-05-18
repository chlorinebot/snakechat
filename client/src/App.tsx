import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/admin/Dashboard';
import Users from './pages/admin/Users';
import Roles from './pages/admin/Roles';
import LockedAccounts from './pages/admin/LockedAccounts';
import HomePage from './pages/home_user/HomePage';
import AccountLockGuard from './components/common/AccountLockGuard';
import api from './services/api';

// URL endpoint cho cập nhật trạng thái
const API_URL = 'http://localhost:5000/api';
const OFFLINE_URL = `${API_URL}/user/update-status-beacon`;
const HEARTBEAT_INTERVAL = 10000; // 10 giây

const App: React.FC = () => {
  // Kiểm tra authentication và role từ localStorage
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(localStorage.getItem('token') !== null);
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('user') || '{}'));
  const isAdmin = user.role_id === 1;
  const isRegularUser = user.role_id === 2;
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
          data.append('timestamp', new Date().getTime().toString()); // Thêm timestamp để tránh cache
          data.append('force', 'true'); // Thêm flag force để đảm bảo cập nhật ngay lập tức
          
          // Sử dụng navigator.sendBeacon để đảm bảo yêu cầu được gửi ngay cả khi đóng tab
          const beaconSent = navigator.sendBeacon(OFFLINE_URL, data);
          console.log('Đã gửi beacon offline:', beaconSent);
          
          // Thêm dữ liệu dự phòng vào localStorage
          localStorage.setItem('lastOfflineAction', JSON.stringify({
            userId,
            timestamp: new Date().getTime(),
            sent: beaconSent
          }));
          
          // Lưu trạng thái offline vào localStorage để các tab khác biết
          localStorage.setItem('userStatus', 'offline');
          localStorage.setItem('offlineTimestamp', new Date().getTime().toString());
          
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
      
      // Log thời gian không hoạt động (debug)
      if (inactiveTime > 10000) { // 10 giây
        console.log(`Thời gian không hoạt động: ${Math.floor(inactiveTime / 1000)} giây`);
      }
      
      // Nếu không hoạt động trong 30 giây (30000ms), đánh dấu là offline
      if (inactiveTime > 30000) {
        console.log('Người dùng không hoạt động trong 30 giây, đánh dấu là offline');
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
          // Kiểm tra localStorage xem người dùng trước đó có ở trạng thái offline không
          const offlineTimestamp = localStorage.getItem('offlineTimestamp');
          if (offlineTimestamp) {
            const now = new Date().getTime();
            const lastOfflineTime = parseInt(offlineTimestamp, 10);
            // Nếu mới đánh dấu offline < 3 giây trước, không cập nhật lại online
            if ((now - lastOfflineTime) < 3000) {
              console.log('Đã đánh dấu offline gần đây, không cập nhật lại online');
              return;
            }
          }
          
          // Cập nhật trạng thái online
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
    }, 10000); // Cập nhật mỗi 10 giây
    
    // Thiết lập interval cho heartbeat
    heartbeatTimerRef.current = setInterval(() => {
      sendHeartbeat();
    }, 10000); // Gửi heartbeat mỗi 10 giây
    
    // Thiết lập interval để kiểm tra định kỳ sự hoạt động của người dùng
    const activityCheckId = setInterval(() => {
      checkUserActivity();
    }, 10000); // Kiểm tra mỗi 10 giây
    
    // Thiết lập interval để cập nhật thông tin bạn bè
    const friendsUpdateId = setInterval(() => {
      // Cập nhật trạng thái bạn bè mỗi 10 giây
      if (isTabActive && isAuthenticated) {
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const parsedUser = JSON.parse(userData);
            const userId = parsedUser.user_id || parsedUser.id;
            if (userId) {
              // Cập nhật thông tin bạn bè để lấy trạng thái mới nhất
              console.log('Cập nhật trạng thái bạn bè...');
              // Sử dụng hàm refreshFriendStatus mới để cập nhật
              api.refreshFriendStatus(userId);
            }
          } catch (error) {
            console.error('Lỗi khi cập nhật trạng thái bạn bè:', error);
          }
        }
      }
    }, 10000); // 10 giây
    
    // Kiểm tra trạng thái khi reload
    const checkOfflineOnReload = () => {
      const lastOfflineAction = localStorage.getItem('lastOfflineAction');
      if (lastOfflineAction) {
        try {
          const offlineData = JSON.parse(lastOfflineAction);
          const now = new Date().getTime();
          // Nếu có dữ liệu offline được lưu trong vòng 5 giây gần đây, gửi lại yêu cầu để đảm bảo
          if (now - offlineData.timestamp < 5000) {
            console.log('Phát hiện yêu cầu offline gần đây, gửi lại để đảm bảo...');
            api.updateUserOffline(offlineData.userId);
          }
          // Xóa dữ liệu sau khi xử lý
          localStorage.removeItem('lastOfflineAction');
        } catch (error) {
          console.error('Lỗi khi xử lý dữ liệu offline tại lúc tải lại:', error);
        }
      }
    };
    
    // Thực hiện kiểm tra ngay khi tải trang
    checkOfflineOnReload();
    
    // Xử lý sự kiện khi người dùng đóng tab/trình duyệt
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      console.log('Sự kiện beforeunload đã được kích hoạt');
      
      // Thực hiện các hành động offline ngay lập tức
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          const userId = parsedUser.user_id || parsedUser.id;
          
          // Đánh dấu offline ngay lập tức
          localStorage.setItem('userStatus', 'offline');
          localStorage.setItem('offlineTimestamp', new Date().getTime().toString());
          
          // Sử dụng Beacon API để đảm bảo yêu cầu được gửi
          if (!sendOfflineBeacon()) {
            // Fallback nếu sendBeacon không được hỗ trợ
            // Lưu vào localStorage để xử lý khi tải lại
            localStorage.setItem('lastOfflineAction', JSON.stringify({
              userId,
              timestamp: new Date().getTime(),
              sent: false
            }));
            
            handleUserOffline();
          }
        } catch (error) {
          console.error('Lỗi khi xử lý đóng tab:', error);
        }
      }
      
      // Không cần hiển thị cảnh báo, chỉ cần cập nhật trạng thái offline
    };
    
    // Thêm sự kiện unload để đảm bảo hơn nữa
    const handleUnload = () => {
      console.log('Sự kiện unload đã được kích hoạt');
      
      // Cũng thực hiện các hành động giống như beforeunload
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          const userId = parsedUser.user_id || parsedUser.id;
          
          // Đánh dấu offline ngay lập tức
          localStorage.setItem('userStatus', 'offline');
          localStorage.setItem('offlineTimestamp', new Date().getTime().toString());
          
          // Sử dụng Beacon API để đảm bảo yêu cầu được gửi
          if (!sendOfflineBeacon()) {
            // Fallback nếu sendBeacon không được hỗ trợ
            localStorage.setItem('lastOfflineAction', JSON.stringify({
              userId,
              timestamp: new Date().getTime(),
              sent: false
            }));
            
            // Thử sử dụng XMLHttpRequest đồng bộ
            try {
              const xhr = new XMLHttpRequest();
              xhr.open('POST', `${API_URL}/user/update-status`, false); // Đặt false để làm cho nó đồng bộ
              xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
              
              if (userId) {
                xhr.send(JSON.stringify({ user_id: userId, status: 'offline', force: true }));
              }
            } catch (xhrError) {
              console.error('Lỗi khi gửi yêu cầu offline đồng bộ:', xhrError);
            }
          }
        } catch (error) {
          console.error('Lỗi khi gửi yêu cầu offline:', error);
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
        const currentTime = new Date().getTime();
        localStorage.setItem('tabHiddenTime', currentTime.toString());
        
        // Dừng heartbeat khi tab không hiển thị
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = null;
        }
        
        // Đặt hẹn giờ để chuyển trạng thái thành offline nếu tab không hiển thị trong 30 giây
        const offlineTimerId = setTimeout(() => {
          console.log('Tab đã ẩn quá lâu, đánh dấu người dùng là offline');
          handleUserOffline();
          localStorage.setItem('userStatus', 'offline');
        }, 30000); // 30 giây
        
        // Lưu timer ID để có thể xóa nếu tab hiển thị lại trước khi hết thời gian
        localStorage.setItem('offlineTimerId', offlineTimerId.toString());
      } else {
        // Tab hiển thị lại
        const hiddenTime = localStorage.getItem('tabHiddenTime');
        const userStatus = localStorage.getItem('userStatus');
        const offlineTimerId = localStorage.getItem('offlineTimerId');
        
        // Xóa timer đánh dấu offline nếu có
        if (offlineTimerId) {
          clearTimeout(parseInt(offlineTimerId, 10));
          localStorage.removeItem('offlineTimerId');
        }
        
        if (hiddenTime) {
          const now = new Date().getTime();
          const hiddenDuration = now - parseInt(hiddenTime, 10);
          
          // Nếu tab đã ẩn quá lâu (30 giây) hoặc đã được đánh dấu là offline
          if (hiddenDuration > 30000 || userStatus === 'offline') {
            console.log('Tab trở lại sau thời gian dài, cập nhật trạng thái online');
            updateOnlineStatus();
            localStorage.setItem('userStatus', 'online');
          }
        }
        
        // Khởi động lại heartbeat khi tab hiển thị lại
        if (!heartbeatTimerRef.current) {
          heartbeatTimerRef.current = setInterval(() => {
            sendHeartbeat();
          }, 10000);
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
      clearInterval(friendsUpdateId);
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
          element={!isAuthenticated ? <Login /> : <Navigate to={isAdmin ? "/admin/dashboard" : "/user-home"} />} 
        />
        <Route 
          path="/register" 
          element={!isAuthenticated ? <Register /> : <Navigate to={isAdmin ? "/admin/dashboard" : "/user-home"} />} 
        />
        
        {/* Admin Routes */}
        <Route 
          path="/admin/dashboard" 
          element={isAuthenticated && isAdmin ? 
            <AccountLockGuard>
              <Dashboard onLogout={handleLogout} />
            </AccountLockGuard> 
            : <Navigate to={isRegularUser ? "/user-home" : "/login"} />
          } 
        />
        <Route 
          path="/admin/users" 
          element={isAuthenticated && isAdmin ? 
            <AccountLockGuard>
              <Users onLogout={handleLogout} />
            </AccountLockGuard> 
            : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/admin/roles" 
          element={isAuthenticated && isAdmin ? 
            <AccountLockGuard>
              <Roles onLogout={handleLogout} />
            </AccountLockGuard> 
            : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/admin/locked-accounts" 
          element={isAuthenticated && isAdmin ? 
            <AccountLockGuard>
              <LockedAccounts onLogout={handleLogout} />
            </AccountLockGuard>
            : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/admin/settings" 
          element={isAuthenticated && isAdmin ? 
            <AccountLockGuard>
              <Navigate to="/admin/dashboard" />
            </AccountLockGuard>
            : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/admin/logs" 
          element={isAuthenticated && isAdmin ? 
            <AccountLockGuard>
              <Navigate to="/admin/dashboard" />
            </AccountLockGuard>
            : <Navigate to="/login" />
          } 
        />
        
        {/* Backward compatibility for old routes */}
        <Route path="/dashboard" element={<Navigate to="/admin/dashboard" />} />
        <Route path="/users" element={<Navigate to="/admin/users" />} />
        <Route path="/roles" element={<Navigate to="/admin/roles" />} />
        <Route path="/locked-accounts" element={<Navigate to="/admin/locked-accounts" />} />
        <Route path="/settings" element={<Navigate to="/admin/settings" />} />
        <Route path="/logs" element={<Navigate to="/admin/logs" />} />
        
        {/* User Routes */}
        <Route 
          path="/user-home" 
          element={isAuthenticated && isRegularUser ? 
            <AccountLockGuard>
              <HomePage onLogout={handleLogout} />
            </AccountLockGuard>
            : <Navigate to={isAdmin ? "/admin/dashboard" : "/login"} />
          } 
        />
        <Route 
          path="/" 
          element={<Navigate to={isAuthenticated ? (isAdmin ? "/admin/dashboard" : "/user-home") : "/login"} />} 
        />
      </Routes>
    </Router>
  );
};

export default App;