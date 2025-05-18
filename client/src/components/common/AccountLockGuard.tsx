import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

interface AccountLockGuardProps {
  children: React.ReactNode;
}

const AccountLockGuard: React.FC<AccountLockGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkAccountStatus = async () => {
      const userJson = localStorage.getItem('user');
      if (!userJson) {
        navigate('/login');
        return;
      }
      
      try {
        const user = JSON.parse(userJson);
        const userId = user.user_id || user.id;
        
        if (!userId) {
          navigate('/login');
          return;
        }
        
        const lockStatus = await api.checkAccountLockStatus(userId);
        
        if (lockStatus.isLocked && lockStatus.lockInfo) {
          console.log('Tài khoản bị khóa:', lockStatus.lockInfo);
          
          // Điều hướng về trang đăng nhập với thông tin khóa tài khoản
          navigate('/login', {
            state: {
              isLocked: true,
              lockInfo: {
                ...lockStatus.lockInfo,
                username: user.username,
                email: user.email
              }
            }
          });
        }
      } catch (error) {
        console.error('Lỗi khi kiểm tra trạng thái tài khoản:', error);
      }
    };
    
    checkAccountStatus();
  }, [navigate]);
  
  return <>{children}</>;
};

export default AccountLockGuard; 