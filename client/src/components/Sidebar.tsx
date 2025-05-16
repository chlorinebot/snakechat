import React from 'react';
import { Nav } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <i className="fas fa-user-shield me-2"></i>
        <span>SnakeChat Admin</span>
      </div>
      <Nav className="flex-column">
        <Nav.Link href="/dashboard" className={`sidebar-item ${currentPath === '/dashboard' ? 'active' : ''}`}>
          <i className="fas fa-tachometer-alt me-2"></i>
          <span>Thống kê hệ thống</span>
        </Nav.Link>
        <Nav.Link href="/users" className={`sidebar-item ${currentPath === '/users' ? 'active' : ''}`}>
          <i className="fas fa-users me-2"></i>
          <span>Quản lý người dùng</span>
        </Nav.Link>
        <Nav.Link href="/roles" className={`sidebar-item ${currentPath === '/roles' ? 'active' : ''}`}>
          <i className="fas fa-user-tag me-2"></i>
          <span>Quản lý vai trò</span>
        </Nav.Link>
        <Nav.Link href="/locked-accounts" className={`sidebar-item ${currentPath === '/locked-accounts' ? 'active' : ''}`}>
          <i className="fas fa-lock me-2"></i>
          <span>Danh sách khóa tài khoản</span>
        </Nav.Link>
        <div className="sidebar-divider"></div>
        <div className="sidebar-heading">Cài đặt hệ thống</div>
        <Nav.Link href="/settings" className={`sidebar-item ${currentPath === '/settings' ? 'active' : ''}`}>
          <i className="fas fa-cog me-2"></i>
          <span>Cấu hình chung</span>
        </Nav.Link>
        <Nav.Link href="/logs" className={`sidebar-item ${currentPath === '/logs' ? 'active' : ''}`}>
          <i className="fas fa-history me-2"></i>
          <span>Nhật ký hoạt động</span>
        </Nav.Link>
      </Nav>
      <div className="sidebar-footer">
        <small className="text-muted">
          <i className="fas fa-circle text-success me-1 pulse-animation"></i>
          <span>Hệ thống đang hoạt động</span>
        </small>
      </div>
    </div>
  );
};

export default Sidebar; 