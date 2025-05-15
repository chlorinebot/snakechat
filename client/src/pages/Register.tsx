import React, { useState } from 'react';
import UserForm from '../components/UserForm';
import { Form } from 'react-bootstrap';

const Register: React.FC = () => {
  const [error, setError] = useState('');

  const handleSubmit = async (data: any) => {
    try {
      if (data.password !== data.confirmPassword) {
        setError('Mật khẩu xác nhận không khớp');
        return;
      }

      const userData = {
        ...data,
        role_id: 1,
        confirmPassword: undefined
      };

      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Đăng ký thành công!');
        window.location.href = '/login';
      } else {
        setError(result.message || 'Đăng ký thất bại');
      }
    } catch (error) {
      setError('Đăng ký thất bại. Vui lòng thử lại sau.');
    }
  };

  const registerFields = [
    {
      name: 'username',
      label: 'Tên người dùng',
      type: 'text',
      placeholder: 'Nhập tên người dùng'
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      placeholder: 'name@example.com'
    },
    {
      name: 'birthday',
      label: 'Ngày sinh',
      type: 'date',
      placeholder: 'Chọn ngày sinh'
    },
    {
      name: 'password',
      label: 'Mật khẩu',
      type: 'password',
      placeholder: '••••••••'
    },
    {
      name: 'confirmPassword',
      label: 'Xác nhận mật khẩu',
      type: 'password',
      placeholder: '••••••••'
    }
  ];

  const extraFields = (
    <Form.Group className="mb-4">
      <Form.Check
        type="checkbox"
        label="Tôi đồng ý với điều khoản sử dụng"
        required
      />
    </Form.Group>
  );

  return (
    <UserForm
      title="Đăng ký"
      subtitle="Tạo tài khoản mới"
      fields={registerFields}
      onSubmit={handleSubmit}
      error={error}
      buttonText="Đăng ký"
      footerText="Đã có tài khoản?"
      footerLink={{
        text: "Đăng nhập",
        to: "/login"
      }}
      extraFields={extraFields}
    />
  );
};

export default Register; 