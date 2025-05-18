import React from 'react';
import { Modal, Button, Alert } from 'react-bootstrap';
import type { User } from '../../services/api';

interface LockedAccountModalProps {
  show: boolean;
  user: User;
  onHide: () => void;
  onLogout: () => void;
  onAppeal: () => void;
}

const LockedAccountModal: React.FC<LockedAccountModalProps> = ({
  show,
  user,
  onHide,
  onLogout,
  onAppeal
}) => {
  // Format dates for better display
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Không xác định';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      backdrop="static"
      keyboard={false}
      centered
      size="lg"
    >
      <Modal.Header className="bg-danger text-white">
        <Modal.Title>
          <i className="bi bi-lock-fill me-2"></i>
          Tài khoản bị khóa
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Alert variant="danger">
          <h4 className="mb-3">Xin chào, {user.username}</h4>
          <p className="mb-3 fs-5">
            Tài khoản của bạn hiện tại đang bị khóa. Bạn không thể truy cập vào hệ thống cho đến khi tài khoản được mở khóa.
          </p>
          
          <div className="mb-3">
            <strong>Lý do khóa:</strong> {user.reason || 'Không có thông tin'}
          </div>
          
          <div className="mb-3">
            <strong>Thời gian khóa:</strong> {formatDate(user.lock_time)}
          </div>
          
          <div className="mb-3">
            <strong>Thời gian mở khóa dự kiến:</strong> {formatDate(user.unlock_time)}
          </div>
          
          <p className="mt-4">
            Nếu bạn cho rằng tài khoản của bạn bị khóa nhầm, vui lòng gửi khiếu nại để được hỗ trợ.
          </p>
        </Alert>
      </Modal.Body>
      <Modal.Footer className="d-flex justify-content-between">
        <Button variant="outline-secondary" onClick={onLogout}>
          <i className="bi bi-box-arrow-right me-2"></i>
          Đăng xuất
        </Button>
        <Button variant="primary" onClick={onAppeal}>
          <i className="bi bi-envelope-exclamation me-2"></i>
          Gửi khiếu nại
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default LockedAccountModal; 