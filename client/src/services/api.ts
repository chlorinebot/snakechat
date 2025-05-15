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
}

export const api = {
  // Lấy danh sách users
  getUsers: async () => {
    const response = await axios.get<{ items: User[] }>(`${API_URL}/data`);
    return response.data.items;
  },

  // Tạo user mới
  createUser: async (userData: User) => {
    const response = await axios.post<{ message: string; data: User }>(`${API_URL}/send`, userData);
    return response.data;
  },

  // Cập nhật thông tin user
  updateUser: async (userData: User) => {
    const response = await axios.put<{ message: string; data: User }>(`${API_URL}/update/${userData.user_id}`, userData);
    return response.data;
  },

  // Xóa user
  deleteUser: async (userId: number) => {
    const response = await axios.delete<{ message: string }>(`${API_URL}/delete/${userId}`);
    return response.data;
  }
};

export default api; 