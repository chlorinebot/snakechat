import React, { useState, useEffect } from 'react';
import axios from 'axios';

type ApiResponse = {
  message: string;
  items?: any[];
  error?: string;
}

type User = {
  username: string;
  email: string;
  password: string;
  birthday?: string;
  role_id: number;
}

const App: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthday, setBirthday] = useState('');
  const [role_id, setRoleId] = useState(2); // Mặc định là user (2)
  const [response, setResponse] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await axios.get<ApiResponse>('http://localhost:5000/api/data');
        setData(data.items || []);
      } catch (error) {
        console.error('Lỗi khi gọi API:', error);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await axios.post<ApiResponse>('http://localhost:5000/api/send', { 
        username, email, password, birthday, role_id 
      });
      setResponse(data.message);
      // Làm mới danh sách
      const { data: newData } = await axios.get<ApiResponse>('http://localhost:5000/api/data');
      setData(newData.items || []);
    } catch (error) {
      console.error('Lỗi khi gửi dữ liệu:', error);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Vite + React + Node.js + MySQL</h1>
      {data && (
        <div>
          <h2>Danh sách Users:</h2>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Tên tài khoản"
          style={{ marginRight: '10px' }}
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          style={{ marginRight: '10px' }}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mật khẩu"
          style={{ marginRight: '10px' }}
        />
        <input
          type="date"
          value={birthday}
          onChange={(e) => setBirthday(e.target.value)}
          style={{ marginRight: '10px' }}
        />
        <select value={role_id} onChange={(e) => setRoleId(parseInt(e.target.value))} style={{ marginRight: '10px' }}>
          <option value={1}>Admin</option>
          <option value={2}>User</option>
        </select>
        <button type="submit">Gửi</button>
      </form>
      {response && <p>Phản hồi: {response}</p>}
    </div>
  );
};

export default App;