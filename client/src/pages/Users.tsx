import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Alert, Button, Table, Badge, Card, Modal, Form, InputGroup, Pagination } from 'react-bootstrap';
import UserForm from '../components/UserForm';
import type { User, UserLock } from '../services/api';
import { api } from '../services/api';
import Layout from '../components/Layout';
import './Dashboard.css';

type SortField = 'user_id' | 'username' | 'email' | 'role_id' | 'birthday';
type SortDirection = 'asc' | 'desc';

interface UsersProps {
  onLogout?: () => void;
}

const Users: React.FC<UsersProps> = ({ onLogout }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockReason, setLockReason] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [showLockInfoModal, setShowLockInfoModal] = useState(false);
  const [sortField, setSortField] = useState<SortField>('user_id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  
  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    // Lọc users khi searchTerm thay đổi
    const filtered = users.filter(user => 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.user_id !== undefined && user.user_id.toString().includes(searchTerm))
    );
    
    // Sắp xếp users theo trường đang được chọn
    const sorted = sortUsers([...filtered]);
    setFilteredUsers(sorted);
    
    // Reset về trang đầu tiên khi thay đổi bộ lọc
    setCurrentPage(1);
  }, [searchTerm, users, sortField, sortDirection]);

  const fetchUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
      const sorted = sortUsers([...data]);
      setFilteredUsers(sorted);
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu:', error);
      setMessage('Lỗi khi tải dữ liệu từ server');
    }
  };

  const sortUsers = (usersToSort: User[]) => {
    return usersToSort.sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      
      switch(sortField) {
        case 'user_id':
          return ((a.user_id || 0) - (b.user_id || 0)) * direction;
        
        case 'username':
          return a.username.localeCompare(b.username) * direction;
        
        case 'email':
          return a.email.localeCompare(b.email) * direction;
        
        case 'role_id':
          // Admin (role_id: 1) sẽ đứng trước User (role_id: 2)
          return (a.role_id - b.role_id) * direction;
        
        case 'birthday':
          const dateA = a.birthday ? new Date(a.birthday).getTime() : 0;
          const dateB = b.birthday ? new Date(b.birthday).getTime() : 0;
          return (dateA - dateB) * direction;
        
        default:
          return 0;
      }
    });
  };

  // Lấy danh sách người dùng hiện tại dựa vào trang hiện tại
  const getCurrentUsers = () => {
    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    return filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  };
  
  // Tính tổng số trang
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  
  // Xử lý chuyển trang
  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };
  
  // Tạo các mục phân trang
  const renderPaginationItems = () => {
    const items = [];
    
    // Nút Previous
    items.push(
      <Pagination.Prev 
        key="prev" 
        onClick={() => paginate(currentPage - 1)} 
        disabled={currentPage === 1}
      />
    );
    
    // Hiển thị trang đầu tiên
    if (currentPage > 3) {
      items.push(
        <Pagination.Item key={1} onClick={() => paginate(1)}>
          1
        </Pagination.Item>
      );
      
      if (currentPage > 4) {
        items.push(<Pagination.Ellipsis key="ellipsis1" />);
      }
    }
    
    // Hiển thị các trang xung quanh trang hiện tại
    for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages, currentPage + 1); i++) {
      items.push(
        <Pagination.Item 
          key={i} 
          active={i === currentPage}
          onClick={() => paginate(i)}
        >
          {i}
        </Pagination.Item>
      );
    }
    
    // Hiển thị trang cuối cùng
    if (currentPage < totalPages - 2) {
      if (currentPage < totalPages - 3) {
        items.push(<Pagination.Ellipsis key="ellipsis2" />);
      }
      
      items.push(
        <Pagination.Item 
          key={totalPages} 
          onClick={() => paginate(totalPages)}
        >
          {totalPages}
        </Pagination.Item>
      );
    }
    
    // Nút Next
    items.push(
      <Pagination.Next 
        key="next" 
        onClick={() => paginate(currentPage + 1)} 
        disabled={currentPage === totalPages || totalPages === 0}
      />
    );
    
    return items;
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      // Nếu field đã được chọn, đổi hướng sắp xếp
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Nếu chọn field mới, đặt hướng sắp xếp mặc định (asc)
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (field !== sortField) {
      return <i className="fas fa-sort text-muted ms-1"></i>;
    }
    
    return sortDirection === 'asc' 
      ? <i className="fas fa-sort-up ms-1"></i> 
      : <i className="fas fa-sort-down ms-1"></i>;
  };

  const handleSubmit = async (userData: Partial<User>) => {
    try {
      const dataToSubmit = {
        ...userData,
        role_id: Number(userData.role_id) || 2
      };

      const response = await api.createUser(dataToSubmit as User);
      setMessage(response.message);
      setShowAddUserModal(false);
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

  const getRoleBadge = (roleId: number) => {
    return roleId === 1 ? 
      <Badge bg="success" className="px-3 py-2">Admin</Badge> : 
      <Badge bg="primary" className="px-3 py-2">User</Badge>;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const handleLock = (user: User) => {
    setSelectedUser(user);
    setShowLockModal(true);
  };

  const handleLockInfo = (user: User) => {
    setSelectedUser(user);
    setShowLockInfoModal(true);
  };

  const handleUnlock = async (userId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn mở khóa tài khoản người dùng này?')) return;
    
    try {
      const response = await api.unlockUser(userId);
      setMessage(response.message);
      setShowLockInfoModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Lỗi khi mở khóa tài khoản:', error);
      setMessage('Lỗi khi mở khóa tài khoản người dùng');
    }
  };

  const handleLockSubmit = async () => {
    try {
      if (!selectedUser || !selectedUser.user_id) return;
      
      const currentDate = new Date().toISOString();
      const unlockDateTime = new Date(unlockDate).toISOString();
      
      const lockData: UserLock = {
        user_id: selectedUser.user_id,
        reason: lockReason,
        lock_time: currentDate,
        unlock_time: unlockDateTime
      };

      const response = await api.lockUser(lockData);
      setMessage(response.message);
      setShowLockModal(false);
      setLockReason('');
      setUnlockDate('');
      fetchUsers();
    } catch (error) {
      console.error('Lỗi khi khóa tài khoản:', error);
      setMessage('Lỗi khi khóa tài khoản người dùng');
    }
  };

  const isUserLocked = (user: User) => {
    // Kiểm tra xem user có thông tin khóa không
    return user.lock_id !== undefined && user.lock_status === 'locked';
  };

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('vi-VN');
  };

  return (
    <Layout onLogout={onLogout}>
      <Container fluid>
        {message && (
          <Alert variant="info" onClose={() => setMessage('')} dismissible>
            {message}
          </Alert>
        )}
        
        <Row className="mb-4">
          <Col>
            <h2 className="text-primary mb-4">Quản lý người dùng</h2>
          </Col>
        </Row>

        <Row className="g-4">
          <Col lg={12}>
            <Card className="shadow-sm border-0">
              <Card.Header className="border-0 py-3">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
                  <h5 className="mb-0 text-primary">Danh sách người dùng</h5>
                  
                  <div className="w-100 flex-grow-1 mx-auto" style={{ maxWidth: "700px" }}>
                    <InputGroup className="search-input-group">
                      <InputGroup.Text>
                        <i className="fas fa-search"></i>
                      </InputGroup.Text>
                      <Form.Control
                        type="text"
                        placeholder="Tìm kiếm theo ID, tên hoặc email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                      />
                    </InputGroup>
                  </div>
                  
                  <Button 
                    variant="primary" 
                    className="add-user-btn"
                    onClick={() => setShowAddUserModal(true)}
                    style={{ 
                      minWidth: "200px", 
                      padding: "0.7rem 1.5rem",
                      borderRadius: "8px",
                      boxShadow: "0 4px 10px rgba(67, 97, 238, 0.3)",
                      border: "none",
                      whiteSpace: "nowrap"
                    }}
                  >
                    <i className="fas fa-plus-circle me-2"></i>
                    Thêm người dùng mới
                  </Button>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                <Table hover responsive className="mb-0 user-table">
                  <thead>
                    <tr>
                      <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => handleSort('user_id')}>
                        ID {getSortIcon('user_id')}
                      </th>
                      <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => handleSort('username')}>
                        Tên người dùng {getSortIcon('username')}
                      </th>
                      <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => handleSort('email')}>
                        Email {getSortIcon('email')}
                      </th>
                      <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => handleSort('role_id')}>
                        Vai trò {getSortIcon('role_id')}
                      </th>
                      <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => handleSort('birthday')}>
                        Ngày sinh {getSortIcon('birthday')}
                      </th>
                      <th scope="col" className="px-4 py-3">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getCurrentUsers().map((user) => (
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
                            className="me-2"
                            onClick={() => user.user_id && handleDelete(user.user_id)}
                          >
                            <i className="fas fa-trash-alt me-1"></i>
                            Xóa
                          </Button>
                          {isUserLocked(user) ? (
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => handleLockInfo(user)}
                            >
                              <i className="fas fa-lock me-1"></i>
                              Đang khóa
                            </Button>
                          ) : (
                            <Button
                              variant="outline-warning"
                              size="sm"
                              onClick={() => handleLock(user)}
                            >
                              <i className="fas fa-lock me-1"></i>
                              Khóa
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                
                {/* Phân trang */}
                <div className="px-4 py-3 d-flex justify-content-between align-items-center border-top">
                  <div className="text-muted small">
                    Hiển thị {Math.min(filteredUsers.length, (currentPage - 1) * usersPerPage + 1)} - {Math.min(currentPage * usersPerPage, filteredUsers.length)} trên tổng số {filteredUsers.length} người dùng
                  </div>
                  <Pagination className="mb-0">
                    {renderPaginationItems()}
                  </Pagination>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Modal Thêm người dùng mới */}
      <Modal show={showAddUserModal} onHide={() => setShowAddUserModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Thêm người dùng mới</Modal.Title>
        </Modal.Header>
        <Modal.Body>
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
        </Modal.Body>
      </Modal>

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
                  defaultValue: selectedUser.birthday ? selectedUser.birthday.split('T')[0] : ''
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

      {/* Modal Khóa tài khoản người dùng */}
      <Modal show={showLockModal} onHide={() => setShowLockModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Khóa tài khoản người dùng</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Tài khoản</Form.Label>
                <Form.Control
                  type="text"
                  value={selectedUser.username}
                  disabled
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Lý do khóa <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Nhập lý do khóa tài khoản"
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Thời gian mở khóa <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="datetime-local"
                  value={unlockDate}
                  onChange={(e) => setUnlockDate(e.target.value)}
                  required
                />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLockModal(false)}>
            Hủy
          </Button>
          <Button 
            variant="warning" 
            onClick={handleLockSubmit}
            disabled={!lockReason || !unlockDate}
          >
            Khóa tài khoản
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Thông tin khóa tài khoản */}
      <Modal show={showLockInfoModal} onHide={() => setShowLockInfoModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Thông tin khóa tài khoản</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <div>
              <p><strong>Tài khoản:</strong> {selectedUser.username}</p>
              <p><strong>Trạng thái:</strong> <Badge bg="danger">Đang khóa</Badge></p>
              <p><strong>Lý do khóa:</strong> {selectedUser.reason}</p>
              <p><strong>Thời gian khóa:</strong> {formatDateTime(selectedUser.lock_time)}</p>
              <p><strong>Thời gian mở khóa:</strong> {formatDateTime(selectedUser.unlock_time)}</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLockInfoModal(false)}>
            Đóng
          </Button>
          <Button 
            variant="success" 
            onClick={() => selectedUser && selectedUser.user_id && handleUnlock(selectedUser.user_id)}
          >
            <i className="fas fa-unlock me-1"></i>
            Mở khóa tài khoản
          </Button>
        </Modal.Footer>
      </Modal>
    </Layout>
  );
};

export default Users; 