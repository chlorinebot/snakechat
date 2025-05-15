import React from 'react';
import { Table, Badge } from 'react-bootstrap';
import type { User } from '../services/api';

interface UserListProps {
  users: User[];
}

const UserList: React.FC<UserListProps> = ({ users }) => {
  return (
    <div className="mt-4">
      <h2 className="mb-4">Danh sách người dùng</h2>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>ID</th>
            <th>Tên người dùng</th>
            <th>Email</th>
            <th>Vai trò</th>
            <th>Ngày sinh</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.user_id}>
              <td>{user.user_id}</td>
              <td>{user.username}</td>
              <td>{user.email}</td>
              <td>
                <Badge bg={user.role_id === 2 ? "primary" : "success"}>
                  {user.role_name}
                </Badge>
              </td>
              <td>{user.birthday}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default UserList; 