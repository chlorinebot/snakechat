import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import UserForm from '../components/admin/UserForm';
import api from '../services/api';
import LockedAccountModal from '../components/modals/LockedAccountModal';
import AppealForm from '../components/modals/AppealForm';
import type { AppealData } from '../components/modals/AppealForm';
import type { User } from '../services/api';

interface LocationState {
  isLocked?: boolean;
  lockInfo?: {
    user_id: number;
    username: string;
    email: string;
    reason: string;
    lock_time: string;
    unlock_time: string;
  };
}

const Login: React.FC = () => {
  const [error, setError] = useState('');
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [lockedUser, setLockedUser] = useState<User | null>(null);
  const location = useLocation();

  // Kiểm tra xem có thông tin khóa tài khoản từ redirect không
  useEffect(() => {
    const state = location.state as LocationState;
    if (state && state.isLocked && state.lockInfo) {
      console.log('Nhận thông tin tài khoản bị khóa từ redirect:', state.lockInfo);
      
      // Hiển thị modal cảnh báo tài khoản bị khóa
      setLockedUser({
        user_id: state.lockInfo.user_id,
        username: state.lockInfo.username,
        email: state.lockInfo.email,
        password: '',
        reason: state.lockInfo.reason,
        lock_time: state.lockInfo.lock_time,
        unlock_time: state.lockInfo.unlock_time,
        role_id: 2 // Mặc định là người dùng thường
      });
      setShowLockedModal(true);
    }
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setShowLockedModal(false);
    window.location.href = '/login';
  };

  const handleAppeal = () => {
    setShowLockedModal(false);
    setShowAppealForm(true);
  };

  const handleSubmitAppeal = async (appealData: AppealData) => {
    try {
      await api.sendAccountAppeal(appealData);
      setShowAppealForm(false);
      // Có thể hiển thị thông báo thành công nếu cần
    } catch (error) {
      console.error('Lỗi khi gửi khiếu nại:', error);
      // Xử lý lỗi
    }
  };

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
        console.log('Thông tin người dùng từ server:', result.user);
        
        // Đảm bảo dữ liệu người dùng có user_id
        const userData = { ...result.user };
        if (!userData.user_id && userData.id) {
          console.log('Chuyển đổi id thành user_id cho tương thích với client');
          userData.user_id = userData.id;
        }
        
        // Kiểm tra xem tài khoản có bị khóa không
        const userId = userData.user_id || userData.id;
        try {
          const lockStatus = await api.checkAccountLockStatus(userId);
          
          if (lockStatus.isLocked && lockStatus.lockInfo) {
            console.log('Tài khoản bị khóa:', lockStatus.lockInfo);
            
            // Hiển thị modal cảnh báo tài khoản bị khóa
            setLockedUser({
              ...userData,
              reason: lockStatus.lockInfo.reason,
              lock_time: lockStatus.lockInfo.lock_time,
              unlock_time: lockStatus.lockInfo.unlock_time
            });
            setShowLockedModal(true);
            
            // Không cho phép đăng nhập khi tài khoản bị khóa
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            return;
          }
        } catch (lockCheckError) {
          console.error('Lỗi kiểm tra trạng thái khóa:', lockCheckError);
        }
        
        // Lưu token và thông tin người dùng vào localStorage
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Cập nhật trạng thái online cho người dùng
        if (userId) {
          try {
            await api.updateStatus(userId, 'online');
            console.log('Đã cập nhật trạng thái online cho user ID:', userId);
          } catch (err) {
            console.error('Lỗi khi cập nhật trạng thái online:', err);
          }
        } else {
          console.error('Không tìm thấy user_id hoặc id trong dữ liệu đăng nhập:', userData);
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
        setError(result.message || 'Thông tin đăng nhập không chính xác');
      }
    } catch (error) {
      console.error('Lỗi đăng nhập chi tiết:', error);
      setError('Đăng nhập thất bại. Vui lòng thử lại sau.');
    }
  };

  const loginFields = [
    {
      name: 'identity',
      label: 'Email hoặc tên đăng nhập',
      type: 'text',
      placeholder: 'Nhập email hoặc tên đăng nhập'
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

      {/* Modal hiển thị khi tài khoản bị khóa */}
      {lockedUser && (
        <LockedAccountModal
          show={showLockedModal}
          user={lockedUser}
          onHide={() => {}} // Không cho phép đóng modal bằng nút X
          onLogout={handleLogout}
          onAppeal={handleAppeal}
        />
      )}

      {/* Form gửi khiếu nại */}
      {lockedUser && (
        <AppealForm
          show={showAppealForm}
          user={lockedUser}
          onHide={() => setShowAppealForm(false)}
          onSubmit={handleSubmitAppeal}
        />
      )}
    </Container>
  );
};

export default Login; 