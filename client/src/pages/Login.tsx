import React, { useState } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import UserForm from '../components/UserForm';
import api from '../services/api';

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
        
        // Cập nhật trạng thái online cho người dùng
        if (result.user && result.user.user_id) {
          try {
            await api.updateStatus(result.user.user_id, 'online');
            console.log('Đã cập nhật trạng thái online');
          } catch (err) {
            console.error('Lỗi khi cập nhật trạng thái online:', err);
          }
        }
        
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

  return (
    <Container fluid className="min-vh-100 d-flex align-items-center justify-content-center bg-light py-5">
      <Row className="justify-content-center w-100">
        <Col xs={12} sm={10} md={8} lg={6} xl={4}>
          <Card className="shadow-sm border-0">
            <Card.Body className="p-4 p-md-5">
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
                extraFields={
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="form-check mb-0">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="rememberMe"
                      />
                      <label className="form-check-label" htmlFor="rememberMe">
                        Ghi nhớ đăng nhập
                      </label>
                    </div>
                    <a href="/forgot-password" className="text-primary text-decoration-none small">
                      Quên mật khẩu?
                    </a>
                  </div>
                }
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Login; 