-- Tạo bảng theo dõi trạng thái online của người dùng (để sử dụng trong tương lai nếu cần)
CREATE TABLE IF NOT EXISTS user_online (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Thêm chỉ mục để tăng tốc độ truy vấn
CREATE INDEX idx_user_online_user_id ON user_online(user_id);
CREATE INDEX idx_user_online_last_activity ON user_online(last_activity);

-- Ghi chú: Bảng này chỉ là một lựa chọn dự phòng. Hiện tại, ứng dụng sử dụng localStorage
-- để theo dõi trạng thái online của người dùng. Trong tương lai, nếu cần lưu trữ lâu dài
-- hoặc phân tích dữ liệu, ta có thể áp dụng bảng này. 