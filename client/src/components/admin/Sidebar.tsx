import React from 'react';
import { Nav } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import './Sidebar.css';

interface AdminSidebarProps {
  visible?: boolean;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ visible = true }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className={`admin-sidebar ${visible ? 'show' : ''}`}>
      <div className="admin-sidebar-header">
        <i className="fas fa-user-shield me-2"></i>
        <span>SnakeChat Admin</span>
      </div>
      <Nav className="flex-column">
        <Nav.Link 
          href="/admin/dashboard" 
          className={`admin-sidebar-item ${currentPath === '/admin/dashboard' ? 'active' : ''}`}
        >
          <i className="fas fa-tachometer-alt me-2"></i>
          <span>Thống kê hệ thống</span>
        </Nav.Link>
        <Nav.Link 
          href="/admin/users" 
          className={`admin-sidebar-item ${currentPath === '/admin/users' ? 'active' : ''}`}
        >
          <i className="fas fa-users me-2"></i>
          <span>Quản lý người dùng</span>
        </Nav.Link>
        <Nav.Link 
          href="/admin/roles" 
          className={`admin-sidebar-item ${currentPath === '/admin/roles' ? 'active' : ''}`}
        >
          <i className="fas fa-user-tag me-2"></i>
          <span>Quản lý vai trò</span>
        </Nav.Link>
        <Nav.Link 
          href="/admin/locked-accounts" 
          className={`admin-sidebar-item ${currentPath === '/admin/locked-accounts' ? 'active' : ''}`}
        >
          <i className="fas fa-lock me-2"></i>
          <span>Danh sách khóa tài khoản</span>
        </Nav.Link>
        <Nav.Link 
          href="/admin/reports" 
          className={`admin-sidebar-item ${currentPath === '/admin/reports' ? 'active' : ''}`}
        >
          <i className="fas fa-flag me-2"></i>
          <span>Danh sách báo cáo</span>
        </Nav.Link>
        <div className="admin-sidebar-divider"></div>
        <div className="admin-sidebar-heading">Cài đặt hệ thống</div>
        <Nav.Link 
          href="/admin/settings" 
          className={`admin-sidebar-item ${currentPath === '/admin/settings' ? 'active' : ''}`}
        >
          <i className="fas fa-cog me-2"></i>
          <span>Cấu hình chung</span>
        </Nav.Link>
        <Nav.Link 
          href="/admin/logs" 
          className={`admin-sidebar-item ${currentPath === '/admin/logs' ? 'active' : ''}`}
        >
          <i className="fas fa-history me-2"></i>
          <span>Nhật ký hoạt động</span>
        </Nav.Link>
      </Nav>
      <div className="admin-sidebar-footer">
        <small className="text-muted">
          <i className="fas fa-circle text-success me-1 pulse-animation"></i>
          <span>Hệ thống đang hoạt động</span>
        </small>
      </div>
    </div>
  );
};

export default AdminSidebar; 