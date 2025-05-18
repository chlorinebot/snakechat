-- Cập nhật timezone cho MySQL server
SET GLOBAL time_zone = '+07:00';
SET time_zone = '+07:00';

-- Reset trường last_activity cho tất cả user online để đảm bảo hoạt động đúng
-- Thay vì chuyển đổi, sẽ cập nhật lại giá trị mới
UPDATE users 
SET last_activity = NOW()
WHERE status = 'online';

-- Hiển thị trạng thái múi giờ sau khi cập nhật
SELECT @@global.time_zone, @@session.time_zone; 