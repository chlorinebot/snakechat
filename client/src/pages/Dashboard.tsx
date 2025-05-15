import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Alert, Button, Table, Badge, Navbar, Nav, Card, Modal } from 'react-bootstrap';
import UserForm from '../components/UserForm';
import type { User } from '../services/api';
import api from '../services/api';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [message, setMessage] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu:', error);
      setMessage('Lỗi khi tải dữ liệu từ server');
    }
  };

  const handleSubmit = async (userData: Partial<User>) => {
    try {
      const dataToSubmit = {
        ...userData,
        role_id: Number(userData.role_id) || 2
      };

      const response = await api.createUser(dataToSubmit as User);
      setMessage(response.message);
      fetchUsers();
    } catch (error) {
      console.error('Lỗi khi gửi dữ liệu:', error);
      setMessage('Lỗi khi thêm người dùng mới');
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleUpdate = async (userData: Partial<User>) => {
    try {
      if (!selectedUser) return;

      const dataToUpdate = {
        ...userData,
        user_id: selectedUser.user_id,
        role_id: Number(userData.role_id) || selectedUser.role_id
      };

      const response = await api.updateUser(dataToUpdate as User);
      setMessage(response.message);
      setShowEditModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Lỗi khi cập nhật:', error);
      setMessage('Lỗi khi cập nhật thông tin người dùng');
    }
  };

  const handleDelete = async (userId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;
    
    try {
      const response = await api.deleteUser(userId);
      setMessage(response.message);
      fetchUsers();
    } catch (error) {
      console.error('Lỗi khi xóa:', error);
      setMessage('Lỗi khi xóa người dùng');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const getRoleBadge = (roleId: number) => {
    return roleId === 1 ? 
      <Badge bg="success" className="px-3 py-2">Admin</Badge> : 
      <Badge bg="primary" className="px-3 py-2">User</Badge>;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  return (
    <div className="min-vh-100 bg-light">
      <Navbar bg="dark" variant="dark" className="shadow-sm">
        <Container fluid className="px-4">
          <Navbar.Brand className="d-flex align-items-center">
            <i className="fas fa-users-cog me-2"></i>
            Quản lý người dùng
          </Navbar.Brand>
          <Nav>
            <Button variant="outline-light" size="sm" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt me-2"></i>
              Đăng xuất
            </Button>
          </Nav>
        </Container>
      </Navbar>

      <Container fluid className="px-4 py-4">
        {message && (
          <Alert variant="info" onClose={() => setMessage('')} dismissible>
            {message}
          </Alert>
        )}

        <Row className="g-4">
          <Col lg={4}>
            <Card className="shadow-sm border-0">
              <Card.Header className="bg-white border-0 py-3">
                <h5 className="mb-0 text-primary">Thêm người dùng mới</h5>
              </Card.Header>
              <Card.Body className="px-4">
                <UserForm 
                  title=""
                  subtitle=""
                  fields={[
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
                      name: 'password',
                      label: 'Mật khẩu',
                      type: 'password',
                      placeholder: '••••••••'
                    },
                    {
                      name: 'birthday',
                      label: 'Ngày sinh',
                      type: 'date',
                      placeholder: ''
                    },
                    {
                      name: 'role_id',
                      label: 'Vai trò',
                      type: 'select',
                      placeholder: '',
                      options: [
                        { value: '2', label: 'User', selected: true },
                        { value: '1', label: 'Admin' }
                      ]
                    }
                  ]}
                  onSubmit={handleSubmit}
                  buttonText="Thêm người dùng"
                  footerText=""
                  footerLink={{ text: "", to: "" }}
                />
              </Card.Body>
            </Card>
          </Col>
          
          <Col lg={8}>
            <Card className="shadow-sm border-0">
              <Card.Header className="bg-white border-0 py-3">
                <h5 className="mb-0 text-primary">Danh sách người dùng</h5>
              </Card.Header>
              <Card.Body className="p-0">
                <Table hover responsive className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th className="border-0 px-4 py-3">ID</th>
                      <th className="border-0 px-4 py-3">Tên người dùng</th>
                      <th className="border-0 px-4 py-3">Email</th>
                      <th className="border-0 px-4 py-3">Vai trò</th>
                      <th className="border-0 px-4 py-3">Ngày sinh</th>
                      <th className="border-0 px-4 py-3">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.user_id}>
                        <td className="px-4 py-3">{user.user_id}</td>
                        <td className="px-4 py-3">{user.username}</td>
                        <td className="px-4 py-3">{user.email}</td>
                        <td className="px-4 py-3">{getRoleBadge(user.role_id)}</td>
                        <td className="px-4 py-3">{formatDate(user.birthday)}</td>
                        <td className="px-4 py-3">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => handleEdit(user)}
                          >
                            <i className="fas fa-edit me-1"></i>
                            Sửa
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => user.user_id && handleDelete(user.user_id)}
                          >
                            <i className="fas fa-trash-alt me-1"></i>
                            Xóa
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Modal Sửa thông tin người dùng */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Sửa thông tin người dùng</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <UserForm 
              title=""
              subtitle=""
              fields={[
                {
                  name: 'username',
                  label: 'Tên người dùng',
                  type: 'text',
                  placeholder: 'Nhập tên người dùng',
                  defaultValue: selectedUser.username
                },
                {
                  name: 'email',
                  label: 'Email',
                  type: 'email',
                  placeholder: 'name@example.com',
                  defaultValue: selectedUser.email
                },
                {
                  name: 'birthday',
                  label: 'Ngày sinh',
                  type: 'date',
                  placeholder: '',
                  defaultValue: selectedUser.birthday
                },
                {
                  name: 'role_id',
                  label: 'Vai trò',
                  type: 'select',
                  placeholder: '',
                  options: [
                    { value: '2', label: 'User', selected: selectedUser.role_id === 2 },
                    { value: '1', label: 'Admin', selected: selectedUser.role_id === 1 }
                  ]
                }
              ]}
              onSubmit={handleUpdate}
              buttonText="Cập nhật"
              footerText=""
              footerLink={{ text: "", to: "" }}
            />
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Dashboard; 