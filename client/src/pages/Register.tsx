import React, { useState } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import UserForm from '../components/UserForm';

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
        role_id: 2,
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

  return (
    <Container fluid className="min-vh-100 d-flex align-items-center justify-content-center bg-light py-5">
      <Row className="justify-content-center w-100">
        <Col xs={12} sm={10} md={8} lg={6} xl={4}>
          <Card className="shadow-sm border-0">
            <Card.Body className="p-4 p-md-5">
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
                extraFields={
                  <div className="form-check mb-4">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="agreeTerms"
                      required
                    />
                    <label className="form-check-label small" htmlFor="agreeTerms">
                      Tôi đồng ý với <a href="#" className="text-primary">điều khoản sử dụng</a> và{' '}
                      <a href="#" className="text-primary">chính sách bảo mật</a>
                    </label>
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

export default Register; 