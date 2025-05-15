import React, { useState } from 'react';
import UserForm from '../components/UserForm';
import { Form } from 'react-bootstrap';

const Login: React.FC = () => {
  const [error, setError] = useState('');

  const handleSubmit = async (data: any) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (result.success) {
        // Lưu token và thông tin người dùng vào localStorage
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        
        // Kiểm tra role_id và điều hướng
        if (result.user.role_id === 1) {
          // Nếu là admin (role_id = 1)
          window.location.href = '/dashboard';
        } else {
          // Nếu là người dùng thường (role_id = 2)
          window.location.href = '/user-home'; // hoặc trang dành cho người dùng thường
        }
      } else {
        setError(result.message || 'Email hoặc mật khẩu không chính xác');
      }
    } catch (error) {
      setError('Đăng nhập thất bại. Vui lòng thử lại sau.');
    }
  };

  const loginFields = [
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      placeholder: 'name@example.com'
    },
    {
      name: 'password',
      label: 'Mật khẩu',
      type: 'password',
      placeholder: '••••••••'
    }
  ];

  const extraFields = (
    <div className="d-flex justify-content-between align-items-center mb-4">
      <Form.Check
        type="checkbox"
        label="Ghi nhớ đăng nhập"
        className="mb-0"
      />
      <a href="/forgot-password" className="text-primary text-decoration-none">
        Quên mật khẩu?
      </a>
    </div>
  );

  return (
    <UserForm
      title="Đăng nhập"
      subtitle="Chào mừng bạn trở lại!"
      fields={loginFields}
      onSubmit={handleSubmit}
      error={error}
      buttonText="Đăng nhập"
      footerText="Chưa có tài khoản?"
      footerLink={{
        text: "Đăng ký ngay",
        to: "/register"
      }}
      extraFields={extraFields}
    />
  );
};

export default Login; 