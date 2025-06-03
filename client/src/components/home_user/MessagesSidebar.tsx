import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import type { Conversation } from '../../services/api';
import socketService from '../../services/socketService';
import { playMessageSound } from '../../utils/sound';

interface MessagesSidebarProps {
  userId: number;
  currentConversation: Conversation | null;
  setCurrentConversation: (conversation: Conversation) => void;
  conversations?: Conversation[];  // Thêm danh sách cuộc trò chuyện từ prop
  setConversations?: React.Dispatch<React.SetStateAction<Conversation[]>>;  // Thêm function để cập nhật danh sách
}

const MessagesSidebar: React.FC<MessagesSidebarProps> = ({ 
  userId, 
  currentConversation, 
  setCurrentConversation,
  conversations: propConversations, // Prop conversations từ component cha
  setConversations: propSetConversations // Prop setConversations từ component cha
}) => {
  const [localConversations, setLocalConversations] = useState<Conversation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [friendIds, setFriendIds] = useState<number[]>([]);

  // Sử dụng conversations từ prop nếu có, ngược lại sử dụng state nội bộ
  const conversations = propConversations || localConversations;
  const setConversations = propSetConversations || setLocalConversations;

  // Hàm lấy danh sách cuộc trò chuyện
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      if (!userId) return;
      
      const userConversations = await api.getUserConversations(userId);
      
      if (!propConversations) {
        setLocalConversations(userConversations);
      }
      // Nếu có propSetConversations, component cha sẽ xử lý việc cập nhật
      else if (propSetConversations) {
        propSetConversations(userConversations);
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách cuộc trò chuyện:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, propConversations, propSetConversations]);

  useEffect(() => {
    // Chỉ gọi API lấy danh sách cuộc trò chuyện nếu không nhận được từ props
    if (!propConversations) {
      fetchConversations();
      
      // Cập nhật danh sách cuộc trò chuyện mỗi 30 giây nếu không có prop
      const intervalId = setInterval(fetchConversations, 30000);
      
      return () => clearInterval(intervalId);
    } else {
      // Nếu có prop conversations thì không cần loading nữa
      setLoading(false);
    }
  }, [userId, propConversations, fetchConversations]);

  // Lắng nghe sự kiện tin nhắn mới để cập nhật danh sách cuộc trò chuyện
  useEffect(() => {
    const handleNewMessage = (data: any) => {
      console.log('MessagesSidebar nhận tin nhắn mới:', data);

      // Phát âm thanh khi nhận tin nhắn mới từ người khác
      if (data.sender_id !== userId) {
        playMessageSound();
      }

      // Cập nhật thông tin tin nhắn mới nhất vào cuộc trò chuyện
      setConversations(prevConversations => {
        const conversationExists = prevConversations.some(
          conv => conv.conversation_id === data.conversation_id
        );

        if (!conversationExists) {
          console.log('Cuộc trò chuyện mới, làm mới danh sách');
          fetchConversations();
          return prevConversations;
        }

        const updatedConversations = prevConversations.map(conv => {
          if (conv.conversation_id === data.conversation_id) {
            // Chỉ cập nhật nội dung và thời gian tin nhắn mới, giữ nguyên unread_count
            return {
              ...conv,
              last_message_id: data.message_id,
              last_message_content: data.content,
              last_message_time: data.created_at
            };
          }
          return conv;
        });

        return updatedConversations.sort((a, b) => {
          const timeA = new Date(a.last_message_time || a.updated_at || 0).getTime();
          const timeB = new Date(b.last_message_time || b.updated_at || 0).getTime();
          return timeB - timeA;
        });
      });
    };
    
    socketService.on('new_message', handleNewMessage);
    
    return () => {
      socketService.off('new_message', handleNewMessage);
    };
  }, [userId, currentConversation, setConversations, fetchConversations]);

  // Tải danh sách bạn bè
  useEffect(() => {
    const loadFriends = async () => {
      if (!userId) return;
      
      try {
        const friends = await api.getFriends(userId);
        // Lấy mảng các ID của bạn bè
        const ids = friends.map(friend => friend.user_id);
        setFriendIds(ids);
        console.log('Danh sách ID bạn bè:', ids);
      } catch (error) {
        console.error('Lỗi khi tải danh sách bạn bè:', error);
      }
    };
    
    loadFriends();
  }, [userId]);

  // Lọc cuộc trò chuyện theo từ khóa tìm kiếm
  const filteredConversations = conversations.filter(conversation => {
    // Kiểm tra xem cuộc trò chuyện có chứa từ khóa không
    // (có thể tìm kiếm theo tên thành viên hoặc nội dung tin nhắn cuối cùng)
    const searchLower = searchTerm.toLowerCase();
    
    // Tìm kiếm trong tên người dùng của thành viên
    const matchesMembers = conversation.members?.some(member => 
      member.username?.toLowerCase().includes(searchLower)
    );
    
    // Tìm kiếm trong nội dung tin nhắn cuối cùng
    const matchesContent = conversation.last_message_content?.toLowerCase().includes(searchLower);
    
    return !searchTerm || matchesMembers || matchesContent;
  });

  // Xử lý chọn cuộc trò chuyện
  const handleSelectConversation = (conversation: Conversation) => {
    // Không lưu vào localStorage nữa để không tự động tải khi khởi động
    // Chỉ cập nhật state hiện tại
    
    // Gọi callback để cập nhật cuộc trò chuyện hiện tại
    setCurrentConversation(conversation);
  };

  // Định dạng thời gian
  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    const today = new Date();
    
    // Kiểm tra nếu cùng ngày
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // Nếu trong tuần này
    const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return date.toLocaleDateString('vi-VN', { weekday: 'short' });
    }
    
    // Nếu khác thì hiển thị ngày tháng
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  // Lấy tên hiển thị cho cuộc trò chuyện
  const getConversationName = (conversation: Conversation) => {
    // Nếu là cuộc trò chuyện 1-1
    if (conversation.conversation_type === 'personal' && conversation.members) {
      // Tìm thành viên khác không phải người dùng hiện tại
      const otherMember = conversation.members.find(member => member.user_id !== userId);
      return otherMember?.username || 'Người dùng';
    }
    
    // Nếu là cuộc trò chuyện nhóm
    return `Nhóm (${conversation.members?.length || 0} thành viên)`;
  };

  // Styles
  const styles = {
    conversationList: {
      display: 'flex',
      flexDirection: 'column' as const,
    },
    conversationItem: {
      display: 'flex',
      padding: '12px 15px',
      borderBottom: '1px solid #eee',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    },
    conversationItemHover: {
      backgroundColor: '#f5f5f5',
    },
    conversationItemActive: {
      backgroundColor: '#e9f5ff',
    },
    conversationAvatar: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      backgroundColor: '#0066ff',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      fontSize: '16px',
      marginRight: '12px',
      position: 'relative' as const,
    },
    conversationTime: {
      fontSize: '12px',
      color: '#888',
      whiteSpace: 'nowrap' as const,
      position: 'relative' as const,
    },
    unreadBadge: {
      position: 'absolute' as const,
      top: '100%',
      right: '0',
      backgroundColor: '#ff3b30',
      color: 'white',
      fontSize: '10px',
      minWidth: '16px',
      height: '16px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid white',
      marginTop: '2px',
    },
    conversationInfo: {
      flex: 1,
      minWidth: 0,
    },
    conversationHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '4px',
    },
    conversationName: {
      fontWeight: 500,
      fontSize: '14px',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden' as const,
      textOverflow: 'ellipsis' as const,
      color: '#000000',
    },
    conversationLastMessage: {
      fontSize: '13px',
      color: '#666',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden' as const,
      textOverflow: 'ellipsis' as const,
    },
    loadingConversations: {
      padding: '20px',
      textAlign: 'center' as const,
      color: '#888',
    },
    emptyConversations: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      textAlign: 'center' as const,
      color: '#000',
      height: '100%',
    },
    emptyIcon: {
      width: '80px',
      height: '80px',
      margin: '0 auto 20px',
      backgroundColor: '#f0f0f0',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      fontWeight: 500,
      fontSize: '16px',
      marginBottom: '5px',
      color: '#000',
    },
    emptyDescription: {
      fontSize: '14px',
      color: '#444',
      maxWidth: '220px',
      lineHeight: '1.5',
    },
  };

  return (
    <div className="messages-sidebar">
      <div className="messages-sidebar-header">
        <h3>Tất cả tin nhắn</h3>
      </div>
      <div className="messages-search-bar">
        <div className="search-icon"></div>
        <input 
          type="text" 
          placeholder="Tìm kiếm tin nhắn..."
          className="messages-search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="messages-sidebar-content">
        {loading ? (
          <div style={styles.loadingConversations}>Đang tải...</div>
        ) : filteredConversations.length > 0 ? (
          <div style={styles.conversationList}>
            {filteredConversations.map((conversation) => {
              // Xác định thành viên khác và màu trạng thái
              const otherMember = conversation.conversation_type === 'personal' && conversation.members
                ? conversation.members.find(member => member.user_id !== userId)
                : null;
              
              // Kiểm tra xem người dùng có phải là bạn bè không dựa trên danh sách đã tải
              const canViewStatus = otherMember ? friendIds.includes(otherMember.user_id) : false;
              const statusColor = canViewStatus && otherMember?.status === 'online' ? '#4CAF50' : '#CCCCCC';
              
              return (
                <div
                  key={conversation.conversation_id}
                  style={{
                    ...styles.conversationItem,
                    ...(currentConversation?.conversation_id === conversation.conversation_id ? styles.conversationItemActive : {})
                  }}
                  onClick={() => handleSelectConversation(conversation)}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = currentConversation?.conversation_id === conversation.conversation_id ? '#e9f5ff' : ''}
                >
                  <div style={styles.conversationAvatar}>
                    {getConversationName(conversation).charAt(0).toUpperCase()}
                    {otherMember && canViewStatus && (
                      <span style={{
                        position: 'absolute',
                        bottom: '2px',
                        right: '2px',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: statusColor,
                        border: '2px solid white'
                      }} />
                    )}
                  </div>
                  <div style={styles.conversationInfo}>
                    <div style={styles.conversationHeader}>
                      <div style={styles.conversationName}>{getConversationName(conversation)}</div>
                      <div style={styles.conversationTime}>
                        {conversation.last_message_time ? formatTime(conversation.last_message_time) : ''}
                        {(conversation.unread_count ?? 0) > 0 && (
                          <div style={styles.unreadBadge}>
                            {(conversation.unread_count ?? 0) > 99 ? '99+' : (conversation.unread_count ?? 0)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={styles.conversationLastMessage}>
                      {conversation.last_message_content || 'Bắt đầu cuộc trò chuyện...'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={styles.emptyConversations}>
            <div style={styles.emptyIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16Z" fill="#888888"/>
              </svg>
            </div>
            <p style={styles.emptyText}>Không có cuộc trò chuyện nào</p>
            <p style={styles.emptyDescription}>Bắt đầu trò chuyện bằng cách nhấn vào nút nhắn tin trong hồ sơ bạn bè</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesSidebar; 