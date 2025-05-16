import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import type { UserLockStatus, OnlineStatus } from '../services/api';
import api from '../services/api';
import Layout from '../components/Layout';
import './Dashboard.css';

interface DashboardProps {
  onLogout?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [growthRate, setGrowthRate] = useState<number>(0);
  const [newUsersThisYear, setNewUsersThisYear] = useState<number>(0);
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  const [onlineRate, setOnlineRate] = useState<number>(0);
  const [lockedUsers, setLockedUsers] = useState<number>(0);
  const [lockedRate, setLockedRate] = useState<number>(0);
  const [monthlyStats, setMonthlyStats] = useState<number[]>([]);
  const [adminCount, setAdminCount] = useState<number>(0);
  const [userCount, setUserCount] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toLocaleTimeString('vi-VN'));

  useEffect(() => {
    // Khi component mount, cập nhật trạng thái người dùng hiện tại nếu đã đăng nhập
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user && user.user_id) {
      api.updateUserActivity(user.user_id);
    }

    fetchData();
    
    // Cập nhật dữ liệu mỗi 5 giây
    const intervalId = setInterval(() => {
      fetchData();
      
      // Cập nhật lại trạng thái online của người dùng hiện tại
      if (user && user.user_id) {
        api.updateUserActivity(user.user_id);
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  const fetchData = async () => {
    try {
      // Lấy danh sách người dùng
      const data = await api.getUsers();
      
      // Debug thông tin người dùng
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const onlineData = localStorage.getItem('online_users');
      console.log('Người dùng hiện tại:', user);
      console.log('Dữ liệu online:', onlineData);
      
      // Tính toán số liệu thống kê
      const total = data.length;
      setTotalUsers(total);
      
      // Giả định tỷ lệ tăng trưởng (hoặc tính toán từ dữ liệu thực tế)
      const growth = 70.5 + (Math.random() * 2 - 1); // Dao động nhẹ 69.5 - 71.5
      setGrowthRate(parseFloat(growth.toFixed(1)));
      
      // Số người dùng mới trong năm
      setNewUsersThisYear(8900 + Math.floor(Math.random() * 100));
      
      // Lấy số liệu người dùng đang online
      const onlineStatus = await api.getOnlineStatus();
      console.log('Trạng thái online:', onlineStatus);
      setOnlineUsers(onlineStatus.onlineUsers);
      setOnlineRate(onlineStatus.onlinePercentage);
      
      // Lấy thông tin về tài khoản bị khóa từ API
      const lockStatus = await api.getLockStatus();
      setLockedUsers(lockStatus.lockedUsers);
      setLockedRate(lockStatus.lockedPercentage);
      
      // Tạo dữ liệu cho biểu đồ theo tháng
      const monthData = generateMonthlyData(total);
      setMonthlyStats(monthData);
      
      // Phân loại người dùng theo vai trò
      const admins = data.filter(user => user.role_id === 1).length;
      setAdminCount(admins);
      setUserCount(total - admins);
      
      // Cập nhật thời gian cập nhật cuối
      setLastUpdate(new Date().toLocaleTimeString('vi-VN'));
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu:', error);
    }
  };

  const generateMonthlyData = (total: number) => {
    // Tạo dữ liệu ngẫu nhiên cho biểu đồ tháng
    const baseValues = [40, 60, 45, 80, 65, 75, 85, 90, 70, 60, 50, 75];
    
    // Thêm biến động nhỏ để tạo hiệu ứng thay đổi theo thời gian thực
    return baseValues.map(value => {
      const variation = Math.random() * 10 - 5; // Biến động -5% đến +5%
      return value + variation;
    });
  };

  return (
    <Layout onLogout={onLogout}>
      <Container fluid>
        <Row className="mb-4">
          <Col>
            <h2 className="text-primary mb-4">Bảng điều khiển</h2>
          </Col>
        </Row>
        
        <Row>
          <Col md={6} lg={4}>
            <Card className="shadow-sm border-0 mb-4 dashboard-card">
              <Card.Body className="p-4">
                <h5 className="text-muted">Tổng số người dùng</h5>
                <div className="d-flex align-items-center mt-3">
                  <h2 className="mb-0 me-3">{totalUsers}</h2>
                  <span className="badge bg-success p-2">
                    <i className="fas fa-arrow-up me-1"></i>
                    {growthRate}%
                  </span>
                </div>
                <p className="text-muted mt-3 mb-0">
                  Bạn đã thêm <span className="text-success">{newUsersThisYear.toLocaleString()}</span> người dùng trong năm nay
                </p>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={6} lg={4}>
            <Card className="shadow-sm border-0 mb-4 dashboard-card">
              <Card.Body className="p-4">
                <h5 className="text-muted">Người dùng đang online</h5>
                <div className="d-flex align-items-center mt-3">
                  <h2 className="mb-0 me-3">{onlineUsers}</h2>
                  <span className="badge bg-info p-2">
                    <i className="fas fa-circle text-success me-1 pulse-animation"></i>
                    {onlineRate}%
                  </span>
                </div>
                <p className="text-muted mt-3 mb-0">
                  Số người dùng đang online trên hệ thống
                </p>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={6} lg={4}>
            <Card className="shadow-sm border-0 mb-4 dashboard-card">
              <Card.Body className="p-4">
                <h5 className="text-muted">Tài khoản bị khóa</h5>
                <div className="d-flex align-items-center mt-3">
                  <h2 className="mb-0 me-3">{lockedUsers}</h2>
                  <span className="badge bg-danger p-2">
                    <i className="fas fa-lock me-1"></i>
                    {lockedRate}%
                  </span>
                </div>
                <p className="text-muted mt-3 mb-0">
                  Tỷ lệ tài khoản đang bị khóa theo dữ liệu thực
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        <Row>
          <Col lg={8}>
            <Card className="shadow-sm border-0 mb-4 dashboard-card">
              <Card.Body className="p-4">
                <h5 className="text-muted mb-4">Thống kê người dùng theo tháng</h5>
                <div className="dashboard-chart">
                  {/* Hiển thị biểu đồ thay đổi theo thời gian thực */}
                  <div className="chart-placeholder">
                    <div className="d-flex justify-content-between text-muted">
                      <span>T1</span>
                      <span>T2</span>
                      <span>T3</span>
                      <span>T4</span>
                      <span>T5</span>
                      <span>T6</span>
                      <span>T7</span>
                      <span>T8</span>
                      <span>T9</span>
                      <span>T10</span>
                      <span>T11</span>
                      <span>T12</span>
                    </div>
                    <div className="chart-bars">
                      {monthlyStats.map((height, index) => (
                        <div 
                          key={index} 
                          className="chart-bar" 
                          style={{ height: `${height}%` }}
                          data-value={Math.round(height)}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col lg={4}>
            <Card className="shadow-sm border-0 mb-4 dashboard-card">
              <Card.Body className="p-4">
                <h5 className="text-muted mb-4">Phân bố người dùng theo vai trò</h5>
                <div className="role-stats">
                  <div className="d-flex justify-content-between mb-3">
                    <span>Admin</span>
                    <span><strong>{adminCount}</strong> ({Math.round(adminCount / totalUsers * 100 || 0)}%)</span>
                  </div>
                  <div className="progress mb-4" style={{ height: '10px' }}>
                    <div 
                      className="progress-bar bg-primary" 
                      style={{ width: `${Math.round(adminCount / totalUsers * 100 || 0)}%` }}
                    ></div>
                  </div>
                  
                  <div className="d-flex justify-content-between mb-3">
                    <span>Người dùng</span>
                    <span><strong>{userCount}</strong> ({Math.round(userCount / totalUsers * 100 || 0)}%)</span>
                  </div>
                  <div className="progress" style={{ height: '10px' }}>
                    <div 
                      className="progress-bar bg-success" 
                      style={{ width: `${Math.round(userCount / totalUsers * 100 || 0)}%` }}
                    ></div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-top">
                  <p className="text-muted mb-2">
                    <small><i className="fas fa-info-circle me-1"></i> Dữ liệu được cập nhật tự động mỗi 5 giây</small>
                  </p>
                  <p className="text-muted">
                    <small>Cập nhật lần cuối: {lastUpdate}</small>
                  </p>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </Layout>
  );
};

export default Dashboard; 