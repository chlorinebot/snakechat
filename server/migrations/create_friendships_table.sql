-- Tạo bảng friendships để lưu trữ mối quan hệ bạn bè
CREATE TABLE IF NOT EXISTS friendships (
  friendship_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id_1 INT NOT NULL, -- Người gửi lời mời kết bạn
  user_id_2 INT NOT NULL, -- Người nhận lời mời kết bạn
  status ENUM('pending', 'accepted') NOT NULL DEFAULT 'pending', -- Trạng thái: pending - chờ xác nhận, accepted - đã chấp nhận
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id_1) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id_2) REFERENCES users(user_id) ON DELETE CASCADE,
  -- Đảm bảo không có mối quan hệ trùng lặp
  CONSTRAINT unique_friendship UNIQUE (user_id_1, user_id_2)
);

-- Thêm chỉ mục để tăng tốc độ truy vấn
CREATE INDEX idx_friendships_user_id_1 ON friendships(user_id_1);
CREATE INDEX idx_friendships_user_id_2 ON friendships(user_id_2);
CREATE INDEX idx_friendships_status ON friendships(status); 