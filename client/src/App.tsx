import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface ApiResponse {
  message: string;
}

const App: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [name, setName] = useState('');
  const [response, setResponse] = useState('');

  // Gọi API GET khi component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await axios.get('http://localhost:5000/api/data');
        setData(result.data);
      } catch (error) {
        console.error('Lỗi khi gọi API:', error);
      }
    };
    fetchData();
  }, []);

  // Gửi dữ liệu qua API POST
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await axios.post<ApiResponse>('http://localhost:5000/api/send', { name });
      setResponse(result.data.message);
    } catch (error) {
      console.error('Lỗi khi gửi dữ liệu:', error);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Vite + React + Node.js</h1>
      {data && (
        <div>
          <h2>Dữ liệu từ Backend:</h2>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nhập tên"
          style={{ marginRight: '10px' }}
        />
        <button type="submit">Gửi</button>
      </form>
      {response && <p>Phản hồi: {response}</p>}
    </div>
  );
};

export default App;