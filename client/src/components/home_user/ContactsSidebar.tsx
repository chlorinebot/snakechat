import React, { useState, useEffect, useRef } from 'react';

type ContactTab = 'friends' | 'requests' | 'explore';

interface ContactsSidebarProps {
  activeTab?: ContactTab; // Tab hiện tại đang được chọn
  onTabChange?: (tab: ContactTab) => void;
  friendRequestCount?: number; // Số lượng lời mời kết bạn
}

const ContactsSidebar: React.FC<ContactsSidebarProps> = ({ activeTab, onTabChange, friendRequestCount = 0 }) => {
  const [currentTab, setCurrentTab] = useState(activeTab);
  const [showBadge, setShowBadge] = useState(false);
  const [badgeText, setBadgeText] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const prevCountRef = useRef(friendRequestCount);
  
  useEffect(() => {
    setCurrentTab(activeTab);
  }, [activeTab]);
  
  useEffect(() => {
    // Kiểm tra xem có lời mời mới không
    const hasNewRequest = friendRequestCount > prevCountRef.current;
    prevCountRef.current = friendRequestCount;
    
    if (friendRequestCount > 0) {
      setShowBadge(true);
      setBadgeText(friendRequestCount > 99 ? '99+' : friendRequestCount.toString());
      
      // Nếu có lời mời mới, kích hoạt hiệu ứng mạnh hơn
      if (hasNewRequest) {
        setIsAnimating(true);
        const timer = setTimeout(() => {
          setIsAnimating(false);
        }, 3000); // Kéo dài thời gian hiệu ứng
        
        return () => clearTimeout(timer);
      }
    } else {
      setShowBadge(false);
      setBadgeText('');
    }
  }, [friendRequestCount]);

  const handleTabChange = (tab: ContactTab) => {
    setCurrentTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  return (
    <div className="contacts-sidebar">
      {/* Sidebar cho danh sách nhóm danh bạ */}
      <div className="contacts-sidebar-header">
        <h3 style={{ color: '#000' }}>Tất cả danh bạ</h3>
      </div>
      <div className="contacts-sidebar-content">
        <div 
          className={`contact-sidebar-item ${currentTab === 'friends' ? 'active' : ''}`}
          onClick={() => handleTabChange('friends')}
        >
          <div className="contact-sidebar-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={currentTab === 'friends' ? "#0084ff" : "#777"}>
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <span style={{ color: currentTab === 'friends' ? '#0084ff' : '#000' }}>Danh sách bạn bè</span>
        </div>
        <div 
          className={`contact-sidebar-item ${currentTab === 'requests' ? 'active' : ''}`}
          onClick={() => handleTabChange('requests')}
          style={{ position: 'relative' }}
        >
          <div className="contact-sidebar-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={currentTab === 'requests' ? "#0084ff" : "#777"}>
              <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <span style={{ color: currentTab === 'requests' ? '#0084ff' : '#000' }}>Lời mời kết bạn</span>
          
          {/* Hiển thị badge khi có lời mời kết bạn */}
          {showBadge && (
            <div className={`friend-request-badge-sidebar ${isAnimating ? 'animating' : ''}`}>
              {badgeText}
            </div>
          )}
        </div>
        <div 
          className={`contact-sidebar-item ${currentTab === 'explore' ? 'active' : ''}`}
          onClick={() => handleTabChange('explore')}
        >
          <div className="contact-sidebar-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={currentTab === 'explore' ? "#0084ff" : "#777"}>
              <path d="M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z"/>
            </svg>
          </div>
          <span style={{ color: currentTab === 'explore' ? '#0084ff' : '#000' }}>Khám phá</span>
        </div>
      </div>
      
      <style>
        {`
          .friend-request-badge-sidebar {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            background-color: #ff3b30;
            color: white;
            border-radius: 10px;
            padding: 1px 6px;
            font-size: 10px;
            min-width: 16px;
            text-align: center;
            font-weight: bold;
            transition: all 0.2s ease;
          }
          
          .friend-request-badge-sidebar.animating {
            animation: pulseStrong 0.6s ease infinite alternate;
          }
          
          @keyframes pulseStrong {
            0% {
              transform: translateY(-50%) scale(1);
              box-shadow: 0 0 0 0 rgba(255, 59, 48, 0.7);
            }
            100% {
              transform: translateY(-50%) scale(1.3);
              box-shadow: 0 0 0 10px rgba(255, 59, 48, 0);
            }
          }
        `}
      </style>
    </div>
  );
};

export default ContactsSidebar; 