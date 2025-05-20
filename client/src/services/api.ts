import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export interface User {
  user_id?: number;
  id?: number;
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
  // Trạng thái online/offline
  status?: string; // 'online' hoặc 'offline'
  join_date?: string;
  last_activity?: string; // Thời gian hoạt động gần nhất
}

export interface UserLock {
  user_id: number;
  reason: string;
  lock_time: string;
  unlock_time: string;
}

export interface Friendship {
  friendship_id?: number;
  user_id_1: number; // Người gửi lời mời kết bạn
  user_id_2: number; // Người nhận lời mời kết bạn
  status: 'pending' | 'accepted'; // Trạng thái: pending - chưa chấp nhận, accepted - đã chấp nhận
  created_at?: string;
  updated_at?: string;
}

// Interface cho tin nhắn
export interface Message {
  message_id: number;
  conversation_id: number;
  sender_id: number;
  sender_name?: string;
  content: string;
  message_type?: string;
  created_at: string;
  is_read: boolean;
  send_failed?: boolean; // Trạng thái gửi không thành công
}

// Interface cho cuộc trò chuyện
export interface Conversation {
  conversation_id: number;
  conversation_type: string;
  created_at: string;
  updated_at: string;
  last_message_id?: number;
  last_message_content?: string;
  last_message_time?: string;
  members?: ConversationMember[];
  unread_count?: number;
}

// Interface cho thành viên trong cuộc trò chuyện
export interface ConversationMember {
  user_id: number;
  username?: string;
  status?: string;
  joined_at: string;
  left_at?: string;
}

// Interface cho tệp đính kèm tin nhắn
export interface MessageAttachment {
  attachment_id: number;
  message_id: number;
  file_uri: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export interface FriendRequest {
  friendship_id: number;
  user: User; // Thông tin người dùng gửi lời mời
  status: string;
  created_at: string;
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

// Hàm kiểm tra trạng thái online của user
const isUserOnline = (user: User) => {
  return user.status === 'online';
};

// Helper function để lấy token từ localStorage
const getToken = (): string => {
  return localStorage.getItem('token') || '';
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
      // Gọi API cập nhật trạng thái vào database
      const response = await axios.post<{ success: boolean; message: string }>(`${API_URL}/user/update-status`, {
        user_id: userId,
        status
      });
      
      return { success: true, message: `Trạng thái đã được cập nhật thành ${status}` };
    } catch (error: any) {
      console.error('Lỗi khi cập nhật trạng thái:', error.message);
      return { success: false, message: 'Lỗi khi cập nhật trạng thái' };
    }
  },

  // Gửi lời mời kết bạn
  sendFriendRequest: async (userId1: number, userId2: number) => {
    try {
      const response = await axios.post<{ success: boolean; message: string; data: Friendship }>(`${API_URL}/friendship/send`, {
        user_id_1: userId1,
        user_id_2: userId2,
        status: 'pending'
      });
      
      return { 
        success: true, 
        message: 'Đã gửi lời mời kết bạn thành công', 
        data: response.data.data 
      };
    } catch (error: any) {
      console.error('Lỗi khi gửi lời mời kết bạn:', error.message);
      return { success: false, message: 'Lỗi khi gửi lời mời kết bạn' };
    }
  },

  // Chấp nhận lời mời kết bạn
  acceptFriendRequest: async (friendshipId: number) => {
    try {
      const response = await axios.put<{ success: boolean; message: string }>(`${API_URL}/friendship/accept/${friendshipId}`, {
        status: 'accepted'
      });
      
      return { success: true, message: 'Đã chấp nhận lời mời kết bạn' };
    } catch (error: any) {
      console.error('Lỗi khi chấp nhận lời mời kết bạn:', error.message);
      return { success: false, message: 'Lỗi khi chấp nhận lời mời kết bạn' };
    }
  },

  // Từ chối hoặc hủy lời mời kết bạn
  rejectFriendRequest: async (friendshipId: number) => {
    try {
      const response = await axios.delete<{ success: boolean; message: string }>(`${API_URL}/friendship/reject/${friendshipId}`);
      
      return { success: true, message: 'Đã từ chối/hủy lời mời kết bạn' };
    } catch (error: any) {
      console.error('Lỗi khi từ chối lời mời kết bạn:', error.message);
      return { success: false, message: 'Lỗi khi từ chối lời mời kết bạn' };
    }
  },

  // Hủy kết bạn
  removeFriend: async (friendshipId: number) => {
    try {
      const response = await axios.delete<{ success: boolean; message: string }>(`${API_URL}/friendship/remove/${friendshipId}`);
      
      return { 
        success: true, 
        message: 'Đã hủy kết bạn thành công' 
      };
    } catch (error: any) {
      console.error('Lỗi khi hủy kết bạn:', error.message);
      return { success: false, message: 'Lỗi khi hủy kết bạn' };
    }
  },

  // Lấy danh sách bạn bè
  getFriends: async (userId: number) => {
    try {
      const response = await axios.get<{ items: any[] }>(`${API_URL}/friendship/friends/${userId}`);
      
      // Kiểm tra và log trạng thái của từng người bạn
      const friends = response.data.items.map(friend => {
        const normalizedStatus = friend.status?.toLowerCase();
        
        // Xử lý trạng thái - đảm bảo luôn trả về chuỗi "online" hoặc "offline" 
        if (!normalizedStatus || (normalizedStatus !== 'online' && normalizedStatus !== 'offline')) {
          console.log(`Người dùng ${friend.username} (ID: ${friend.user_id}) có trạng thái không hợp lệ: ${friend.status}, đặt thành offline`);
          friend.status = 'offline';
        } else {
          // Chuẩn hóa trạng thái
          friend.status = normalizedStatus;
          console.log(`Người dùng ${friend.username} (ID: ${friend.user_id}) có trạng thái: ${friend.status}`);
        }
        return friend;
      });
      
      console.log('Danh sách bạn bè sau khi xử lý:', friends);
      return friends;
    } catch (error) {
      console.error('Lỗi khi lấy danh sách bạn bè:', error);
      return [];
    }
  },

  // Lấy danh sách lời mời kết bạn đã nhận
  getReceivedFriendRequests: async (userId: number) => {
    try {
      const response = await axios.get<{ items: any[] }>(`${API_URL}/friendship/received/${userId}`);
      return response.data.items;
    } catch (error) {
      console.error('Lỗi khi lấy danh sách lời mời kết bạn:', error);
      return [];
    }
  },

  // Lấy danh sách lời mời kết bạn đã gửi
  getSentFriendRequests: async (userId: number) => {
    try {
      const response = await axios.get<{ items: any[] }>(`${API_URL}/friendship/sent/${userId}`);
      return response.data.items;
    } catch (error) {
      console.error('Lỗi khi lấy danh sách lời mời đã gửi:', error);
      return [];
    }
  },

  // Kiểm tra trạng thái kết bạn giữa hai người dùng
  checkFriendshipStatus: async (userId1: number, userId2: number) => {
    try {
      const response = await axios.get<{ status: string | null; friendship_id?: number }>(`${API_URL}/friendship/status`, {
        params: { user_id_1: userId1, user_id_2: userId2 }
      });
      
      return response.data;
    } catch (error) {
      console.error('Lỗi khi kiểm tra trạng thái kết bạn:', error);
      return { status: null };
    }
  },

  // Lấy trạng thái khóa tài khoản
  getLockStatus: async () => {
    try {
      // Lấy danh sách người dùng
      const users = await api.getUsers();
      
      // Tính toán số liệu - kiểm tra lock_id và lock_status từ bảng user_lock
      const totalUsers = users.length;
      const lockedUsers = users.filter(user => user.lock_id && user.lock_status === 'locked').length;
      const lockedPercentage = totalUsers > 0 ? Math.round((lockedUsers / totalUsers) * 100) : 0;
      
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
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái hoạt động:', error);
    }
  },

  // Đánh dấu người dùng offline
  updateUserOffline: async (userId: number) => {
    try {
      if (!userId) return;
      
      console.log(`Cập nhật trạng thái offline cho người dùng ID ${userId}`);
      
      // Đặt trạng thái người dùng trong localStorage là offline
      localStorage.setItem('userStatus', 'offline');
      
      // Sử dụng Beacon API nếu có (đáng tin cậy hơn khi đóng tab)
      if (navigator.sendBeacon) {
        const data = new FormData();
        data.append('user_id', userId.toString());
        data.append('status', 'offline');
        data.append('force', 'true');
        data.append('timestamp', new Date().getTime().toString());
        const beaconSent = navigator.sendBeacon(`${API_URL}/user/update-status-beacon`, data);
        console.log('Đã gửi beacon offline:', beaconSent);
      }
      
      // Song song sử dụng axios đối với các yêu cầu bình thường
      // Sử dụng timeout ngắn (1s) để tránh treo hệ thống
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);
        
        const response = await axios.post<{ success: boolean; message: string }>(
          `${API_URL}/user/update-status`,
          {
            user_id: userId,
            status: 'offline',
            force: true,
            timestamp: new Date().getTime()
          },
          // Sử dụng dạng không kiểm tra kiểu để bỏ qua lỗi linter
          { signal: controller.signal } as any
        );
        
        clearTimeout(timeoutId);
        console.log('Kết quả cập nhật offline qua axios:', response.data);
      } catch (axiosError) {
        // Lỗi có thể xảy ra khi tab đóng, không cần xử lý
        console.log('Cập nhật offline qua axios không thành công, đã sử dụng beacon');
      }
      
      return { success: true, message: 'Trạng thái đã được cập nhật thành offline' };
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái offline:', error);
      return { success: false, message: 'Lỗi khi cập nhật trạng thái offline' };
    }
  },

  // Gửi heartbeat để xác nhận người dùng vẫn đang hoạt động
  sendHeartbeat: async (userId: number) => {
    try {
      if (!userId) return;
      
      // Gửi heartbeat lên server
      const response = await axios.post<{ success: boolean; message: string }>(`${API_URL}/user/heartbeat`, {
        user_id: userId
      });
      
      return response.data;
    } catch (error) {
      console.error('Lỗi khi gửi heartbeat:', error);
      return { success: false, message: 'Lỗi khi gửi heartbeat' };
    }
  },

  // Lấy số liệu người dùng đang online
  getOnlineStatus: async () => {
    try {
      // Lấy danh sách tất cả người dùng
      const users = await api.getUsers();
      const totalUsers = users.length;
      
      // Đếm số người dùng đang online dựa vào cột status
      const onlineUsers = users.filter(user => user.status === 'online');
      const onlineCount = onlineUsers.length;
      const onlinePercentage = totalUsers > 0 ? Math.round((onlineCount / totalUsers) * 100) : 0;
      
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

  // Gửi khiếu nại cho tài khoản bị khóa
  sendAccountAppeal: async (appealData: {
    userId: number;
    username: string;
    email: string;
    reason: string;
    explanation: string;
  }) => {
    try {
      const response = await axios.post<{ success: boolean; message: string }>(`${API_URL}/user/appeal`, appealData);
      return response.data;
    } catch (error: any) {
      console.error('Lỗi khi gửi khiếu nại:', error.message);
      throw error;
    }
  },

  // Kiểm tra trạng thái khóa của tài khoản
  checkAccountLockStatus: async (userId: number) => {
    try {
      const response = await axios.get<{ 
        isLocked: boolean;
        lockInfo?: {
          user_id: number;
          reason: string;
          lock_time: string;
          unlock_time: string;
        }
      }>(`${API_URL}/user/check-lock-status/${userId}`);
      return response.data;
    } catch (error: any) {
      console.error('Lỗi khi kiểm tra trạng thái khóa tài khoản:', error.message);
      return { isLocked: false };
    }
  },

  // Lấy danh sách vai trò
  getRoles: async () => {
    const response = await axios.get<{ items: Role[] }>(`${API_URL}/role/data`);
    return response.data.items;
  },

  // Tạo vai trò mới
  createRole: async (roleData: Partial<Role>) => {
    const response = await axios.post<{ message: string; data: Role }>(`${API_URL}/role/send`, roleData);
    return response.data;
  },

  // Cập nhật vai trò
  updateRole: async (roleData: Partial<Role>) => {
    const response = await axios.put<{ message: string; data: Role }>(`${API_URL}/role/update/${roleData.role_id}`, roleData);
    return response.data;
  },

  // Xóa vai trò
  deleteRole: async (roleId: number) => {
    const response = await axios.delete<{ message: string }>(`${API_URL}/role/delete/${roleId}`);
    return response.data;
  },

  // Lấy lịch sử khóa tài khoản
  getLockHistory: async () => {
    const response = await axios.get<{ items: any[] }>(`${API_URL}/user/lock-history`);
    return response.data.items;
  },

  // Lấy danh sách tài khoản bị khóa
  getLockedAccounts: async () => {
    try {
      // Trước tiên lấy tất cả người dùng
      const response = await axios.get<{ items: User[] }>(`${API_URL}/user/data`);
      const users = response.data.items;
      
      // Lọc những người dùng có trạng thái khóa
      const lockedUsers = users.filter(user => user.lock_id && user.lock_status === 'locked');
      
      return lockedUsers;
    } catch (error) {
      console.error('Lỗi khi lấy danh sách tài khoản bị khóa:', error);
      return [];
    }
  },

  // Tìm kiếm người dùng theo tên hoặc email
  searchUsers: async (searchTerm: string) => {
    try {
      // Lấy tất cả người dùng
      const response = await axios.get<{ items: User[] }>(`${API_URL}/user/data`);
      const users = response.data.items;
      
      // Log tất cả người dùng để kiểm tra dữ liệu
      console.log("Dữ liệu người dùng từ server:", users);
      
      // Lọc người dùng theo tên hoặc email
      if (!searchTerm) return [];
      
      const searchTermLower = searchTerm.toLowerCase();
      let filteredUsers = users.filter(user => 
        user.username.toLowerCase().includes(searchTermLower) || 
        user.email.toLowerCase().includes(searchTermLower)
      );
      
      // Đảm bảo tất cả người dùng có trạng thái
      filteredUsers = filteredUsers.map(user => {
        // Lưu trữ đầy đủ thông tin người dùng
        return {
          ...user,
          // Đảm bảo có trạng thái, mặc định là 'offline' nếu không có
          status: user.status || 'offline'
        };
      });
      
      console.log("Kết quả tìm kiếm đã xử lý:", filteredUsers);
      return filteredUsers;
    } catch (error) {
      console.error('Lỗi khi tìm kiếm người dùng:', error);
      return [];
    }
  },

  // Làm mới trạng thái bạn bè (gọi thủ công)
  refreshFriendStatus: async (userId: number) => {
    try {
      console.log('Đang làm mới trạng thái bạn bè...');
      
      // Lấy danh sách bạn bè với trạng thái mới nhất từ server
      const response = await axios.get<{ items: any[] }>(`${API_URL}/friendship/friends/${userId}?t=${new Date().getTime()}`);
      
      // Kiểm tra và log trạng thái của từng người bạn
      const friends = response.data.items.map(friend => {
        const normalizedStatus = friend.status?.toLowerCase();
        
        // Xử lý trạng thái - đảm bảo luôn trả về chuỗi "online" hoặc "offline" 
        if (!normalizedStatus || (normalizedStatus !== 'online' && normalizedStatus !== 'offline')) {
          console.log(`Người dùng ${friend.username} (ID: ${friend.user_id}) có trạng thái không hợp lệ: ${friend.status}, đặt thành offline`);
          friend.status = 'offline';
        } else {
          // Chuẩn hóa trạng thái
          friend.status = normalizedStatus;
          console.log(`Người dùng ${friend.username} (ID: ${friend.user_id}) có trạng thái: ${friend.status}`);
        }
        return friend;
      });
      
      console.log('Đã làm mới trạng thái bạn bè:', friends);
      
      // Lưu danh sách bạn bè đã cập nhật vào localStorage để có thể dùng ngay lập tức
      localStorage.setItem('cachedFriends', JSON.stringify(friends));
      
      return friends;
    } catch (error) {
      console.error('Lỗi khi làm mới trạng thái bạn bè:', error);
      return [];
    }
  },

  // Cập nhật cơ sở dữ liệu và thời gian hoạt động
  updateLastActivitySystem: async () => {
    try {
      console.log('Đang cập nhật cấu trúc cơ sở dữ liệu và thời gian hoạt động...');
      const response = await axios.get<{ success: boolean; message: string; data: any }>(`${API_URL}/user/update-last-activity`);
      console.log('Kết quả cập nhật:', response.data);
      return response.data;
    } catch (error) {
      console.error('Lỗi khi cập nhật:', error);
      return { success: false, message: 'Lỗi khi cập nhật hệ thống' };
    }
  },

  // PHẦN QUẢN LÝ TIN NHẮN

  // Lấy danh sách cuộc trò chuyện của người dùng
  getUserConversations: async (userId: number) => {
    try {
      const response = await axios.get<{ items: Conversation[] }>(
        `${API_URL}/conversations/user/${userId}`
      );
      return response.data.items;
    } catch (error) {
      console.error('Lỗi khi lấy danh sách cuộc trò chuyện:', error);
      return [];
    }
  },

  // Lấy chi tiết cuộc trò chuyện
  getConversationDetails: async (conversationId: number) => {
    try {
      const response = await axios.get<{ data: Conversation }>(
        `${API_URL}/conversations/${conversationId}`
      );
      return response.data.data;
    } catch (error) {
      console.error('Lỗi khi lấy chi tiết cuộc trò chuyện:', error);
      throw error;
    }
  },

  // Tạo cuộc trò chuyện mới
  createConversation: async (userIds: number[]) => {
    try {
      const response = await axios.post<{ success: boolean; data: Conversation }>(
        `${API_URL}/conversations/create`,
        { user_ids: userIds }
      );
      return response.data;
    } catch (error) {
      console.error('Lỗi khi tạo cuộc trò chuyện mới:', error);
      throw error;
    }
  },

  // Lấy tin nhắn trong cuộc trò chuyện
  getConversationMessages: async (conversationId: number) => {
    try {
      const response = await axios.get<{ items: Message[] }>(
        `${API_URL}/messages/conversation/${conversationId}`
      );
      return response.data.items;
    } catch (error) {
      console.error('Lỗi khi lấy tin nhắn trong cuộc trò chuyện:', error);
      return [];
    }
  },

  // Gửi tin nhắn mới
  sendMessage: async (message: {
    conversation_id: number;
    sender_id: number;
    content: string;
    message_type?: string;
  }) => {
    try {
      const response = await axios.post<{ success: boolean; data: Message }>(
        `${API_URL}/messages/send`,
        message
      );
      return response.data;
    } catch (error) {
      console.error('Lỗi khi gửi tin nhắn:', error);
      throw error;
    }
  },

  // Đánh dấu tin nhắn đã đọc
  markMessageAsRead: async (messageId: number) => {
    try {
      const response = await axios.put<{ success: boolean }>(
        `${API_URL}/messages/mark-read/${messageId}`
      );
      return response.data;
    } catch (error) {
      console.error('Lỗi khi đánh dấu tin nhắn đã đọc:', error);
      throw error;
    }
  },

  // Đánh dấu tất cả tin nhắn trong cuộc trò chuyện đã đọc
  markAllMessagesAsRead: async (conversationId: number, userId: number) => {
    try {
      const response = await fetch(`${API_URL}/messages/mark-all-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          user_id: userId
        })
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Lỗi khi đánh dấu tất cả tin nhắn đã đọc:', error);
      return { success: false, error: 'Không thể đánh dấu tin nhắn đã đọc' };
    }
  },

  // Lấy thông tin trạng thái đã đọc của tin nhắn
  getMessageReadStatus: async (conversationId: number, userId: number) => {
    try {
      const response = await fetch(`${API_URL}/messages/read-status?conversation_id=${conversationId}&user_id=${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Lỗi khi lấy thông tin trạng thái đã đọc:', error);
      return { success: false, error: 'Không thể lấy thông tin trạng thái đã đọc' };
    }
  },

  // Kiểm tra và tạo cuộc trò chuyện với một người dùng (nếu chưa tồn tại)
  getOrCreateOneToOneConversation: async (currentUserId: number, otherUserId: number) => {
    try {
      const response = await axios.post<{ success: boolean; data: Conversation }>(
        `${API_URL}/conversations/one-to-one`,
        { user_id_1: currentUserId, user_id_2: otherUserId }
      );
      return response.data;
    } catch (error) {
      console.error('Lỗi khi tạo/lấy cuộc trò chuyện 1-1:', error);
      throw error;
    }
  },
};

export default api; 