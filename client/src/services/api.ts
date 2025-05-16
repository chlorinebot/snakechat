import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export interface User {
  user_id?: number;
  username: string;
  email: string;
  password: string;
  birthday?: string;
  role_id: number;
  role_name?: string;
  // Thông tin khóa tài khoản
  lock_id?: number;
  reason?: string;
  lock_status?: string; // Trạng thái khóa: 'locked' hoặc 'unlocked'
  lock_time?: string;
  unlock_time?: string;
  // Trạng thái online
  is_online?: boolean;
  last_activity?: string;
}

export interface UserLock {
  user_id: number;
  reason: string;
  lock_time: string;
  unlock_time: string;
}

export interface UserLockStatus {
  totalUsers: number;
  lockedUsers: number;
  lockedPercentage: number;
}

export interface OnlineStatus {
  totalUsers: number;
  onlineUsers: number;
  onlinePercentage: number;
}

export interface Role {
  role_id: number;
  role_name: string;
  description: string;
}

// Thời gian (ms) mà người dùng được coi là online sau hoạt động cuối cùng
const ONLINE_THRESHOLD = 5 * 60 * 1000; // 5 phút

// Định nghĩa interface cho dữ liệu người dùng online
interface OnlineUserData {
  userId: number;
  timestamp: number;
}

// Hàm để lấy danh sách người dùng đang online từ localStorage
const getOnlineUsersFromStorage = (): OnlineUserData[] => {
  const onlineData = localStorage.getItem('online_users');
  if (onlineData) {
    try {
      return JSON.parse(onlineData);
    } catch (e) {
      console.error('Lỗi khi đọc dữ liệu online từ localStorage:', e);
      return [];
    }
  }
  return [];
};

// Hàm để lưu danh sách người dùng đang online vào localStorage
const saveOnlineUsersToStorage = (onlineUsers: OnlineUserData[]) => {
  localStorage.setItem('online_users', JSON.stringify(onlineUsers));
};

// Kiểm tra xem người dùng có đang online không
const isUserOnline = (userId: number, onlineUsers: OnlineUserData[]) => {
  const currentTime = new Date().getTime();
  const user = onlineUsers.find(u => u.userId === userId);
  return user && (currentTime - user.timestamp) < ONLINE_THRESHOLD;
};

export const api = {
  // Lấy danh sách users
  getUsers: async () => {
    const response = await axios.get<{ items: User[] }>(`${API_URL}/user/data`);
    return response.data.items;
  },

  // Tạo user mới
  createUser: async (userData: User) => {
    const response = await axios.post<{ message: string; data: User }>(`${API_URL}/user/send`, userData);
    return response.data;
  },

  // Cập nhật thông tin user
  updateUser: async (userData: User) => {
    const response = await axios.put<{ message: string; data: User }>(`${API_URL}/user/update/${userData.user_id}`, userData);
    return response.data;
  },

  // Xóa user
  deleteUser: async (userId: number) => {
    const response = await axios.delete<{ message: string }>(`${API_URL}/user/delete/${userId}`);
    return response.data;
  },

  // Khóa tài khoản user
  lockUser: async (lockData: UserLock) => {
    const response = await axios.post<{ message: string }>(`${API_URL}/user/lock`, lockData);
    return response.data;
  },

  // Mở khóa tài khoản user
  unlockUser: async (userId: number) => {
    const response = await axios.post<{ message: string }>(`${API_URL}/user/unlock/${userId}`);
    return response.data;
  },

  // Cập nhật trạng thái online/offline
  updateStatus: async (userId: number, status: 'online' | 'offline') => {
    try {
      // Lưu trạng thái vào localStorage thay vì gửi lên server
      if (status === 'online') {
        const onlineUsers = getOnlineUsersFromStorage();
        const currentTime = new Date().getTime();
        
        const existingUserIndex = onlineUsers.findIndex(user => user.userId === userId);
        if (existingUserIndex >= 0) {
          onlineUsers[existingUserIndex].timestamp = currentTime;
        } else {
          onlineUsers.push({ userId, timestamp: currentTime });
        }
        
        saveOnlineUsersToStorage(onlineUsers);
      } else {
        // Xóa người dùng khỏi danh sách online
        const onlineUsers = getOnlineUsersFromStorage();
        const filteredUsers = onlineUsers.filter(user => user.userId !== userId);
        saveOnlineUsersToStorage(filteredUsers);
      }
      
      // Vẫn gọi API để ghi log hoặc các xử lý khác nếu cần
      await axios.post<{ success: boolean; message: string }>(`${API_URL}/user/update-status`, {
        user_id: userId,
        status
      });
      
      return { success: true, message: `Trạng thái đã được cập nhật thành ${status}` };
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái:', error);
      return { success: false, message: 'Lỗi khi cập nhật trạng thái' };
    }
  },

  // Lấy trạng thái khóa tài khoản
  getLockStatus: async () => {
    try {
      // Trong môi trường thực, sẽ gọi API riêng
      // const response = await axios.get<UserLockStatus>(`${API_URL}/lock-status`);
      // return response.data;
      
      // Hiện tại sử dụng dữ liệu từ API getUsers
      const users = await api.getUsers();
      
      // Tính toán số liệu - kiểm tra lock_id và lock_status từ bảng user_lock
      const totalUsers = users.length;
      const lockedUsers = users.filter(user => user.lock_id && user.lock_status === 'locked').length;
      const lockedPercentage = totalUsers > 0 ? Math.round((lockedUsers / totalUsers) * 100) : 0;
      
      console.log('Số tài khoản bị khóa:', lockedUsers, 'trên tổng', totalUsers);
      
      return {
        totalUsers,
        lockedUsers,
        lockedPercentage
      };
    } catch (error) {
      console.error('Lỗi khi lấy trạng thái khóa tài khoản:', error);
      return {
        totalUsers: 0,
        lockedUsers: 0,
        lockedPercentage: 0
      };
    }
  },

  // Đánh dấu người dùng đang online
  updateUserActivity: async (userId: number) => {
    try {
      if (!userId) return;
      
      // Cập nhật trạng thái online
      await api.updateStatus(userId, 'online');
      
      console.log(`Đã cập nhật trạng thái online cho người dùng ID: ${userId}`);
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái hoạt động:', error);
    }
  },

  // Đánh dấu người dùng offline
  updateUserOffline: async (userId: number) => {
    try {
      if (!userId) return;
      
      // Cập nhật trạng thái offline
      await api.updateStatus(userId, 'offline');
      
      console.log(`Đã cập nhật trạng thái offline cho người dùng ID: ${userId}`);
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái offline:', error);
    }
  },

  // Lấy số liệu người dùng đang online
  getOnlineStatus: async () => {
    try {
      // Lấy danh sách tất cả người dùng
      const users = await api.getUsers();
      const totalUsers = users.length;
      
      // Lấy thông tin người dùng online từ localStorage
      const onlineUsers = getOnlineUsersFromStorage();
      const currentTime = new Date().getTime();
      
      // Đếm số người dùng đang online (đã hoạt động trong vòng 5 phút gần đây)
      // và không bị khóa tài khoản
      const activeOnlineUsers = onlineUsers.filter(onlineUser => {
        // Kiểm tra thời gian hoạt động
        const isActive = (currentTime - onlineUser.timestamp) < ONLINE_THRESHOLD;
        
        // Tìm thông tin user từ danh sách users
        const userInfo = users.find(u => u.user_id === onlineUser.userId);
        
        // Kiểm tra xem user có bị khóa không
        const isLocked = userInfo && userInfo.lock_id && userInfo.lock_status === 'locked';
        
        return isActive && userInfo && !isLocked;
      });
      
      const onlineCount = activeOnlineUsers.length;
      const onlinePercentage = totalUsers > 0 ? Math.round((onlineCount / totalUsers) * 100) : 0;
      
      console.log(`Số người dùng đang online: ${onlineCount}/${totalUsers} (${onlinePercentage}%)`);
      
      return {
        totalUsers,
        onlineUsers: onlineCount,
        onlinePercentage: onlinePercentage
      };
    } catch (error) {
      console.error('Lỗi khi lấy trạng thái online:', error);
      return {
        totalUsers: 0,
        onlineUsers: 0,
        onlinePercentage: 0
      };
    }
  },

  // Lấy danh sách vai trò
  getRoles: async (): Promise<Role[]> => {
    try {
      const response = await axios.get<{ success: boolean; message: string; items: Role[] }>(`${API_URL}/role/data`);
      return response.data.items;
    } catch (error) {
      console.error('Lỗi khi lấy danh sách vai trò:', error);
      throw error;
    }
  },

  // Thêm vai trò mới
  createRole: async (roleData: Partial<Role>): Promise<Role> => {
    try {
      const response = await axios.post<{ success: boolean; message: string; data: Role }>(`${API_URL}/role/send`, roleData);
      return response.data.data;
    } catch (error) {
      console.error('Lỗi khi thêm vai trò:', error);
      throw error;
    }
  },

  // Cập nhật vai trò
  updateRole: async (roleId: number, roleData: Partial<Role>): Promise<Role> => {
    try {
      const response = await axios.put<{ success: boolean; message: string; data: Role }>(`${API_URL}/role/update/${roleId}`, roleData);
      return response.data.data;
    } catch (error) {
      console.error('Lỗi khi cập nhật vai trò:', error);
      throw error;
    }
  },

  // Xóa vai trò
  deleteRole: async (roleId: number): Promise<boolean> => {
    try {
      const response = await axios.delete<{ success: boolean; message: string }>(`${API_URL}/role/delete/${roleId}`);
      return response.data.success;
    } catch (error) {
      console.error('Lỗi khi xóa vai trò:', error);
      throw error;
    }
  },

  // Lấy danh sách tài khoản bị khóa
  getLockedAccounts: async () => {
    try {
      // Sử dụng getUsers và lọc ra các tài khoản bị khóa
      const users = await api.getUsers();
      const lockedAccounts = users.filter(user => user.lock_status === 'locked');
      
      // Sắp xếp theo thời gian khóa mới nhất trước
      return lockedAccounts.sort((a, b) => {
        const timeA = a.lock_time ? new Date(a.lock_time).getTime() : 0;
        const timeB = b.lock_time ? new Date(b.lock_time).getTime() : 0;
        return timeB - timeA;
      });
    } catch (error) {
      console.error('Lỗi khi lấy danh sách tài khoản bị khóa:', error);
      throw error;
    }
  },

  // Lấy tất cả các bản ghi khóa tài khoản (lịch sử)
  getLockHistory: async () => {
    try {
      const response = await axios.get<{ items: UserLock[] }>(`${API_URL}/user/lock-history`);
      return response.data.items;
    } catch (error) {
      console.error('Lỗi khi lấy lịch sử khóa tài khoản:', error);
      return [];
    }
  },
};

export default api; 