import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import type { Conversation } from '../../services/api';
import socketService from '../../services/socketService';

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

  // Lắng nghe sự kiện cập nhật tin nhắn chưa đọc và danh sách cuộc trò chuyện
  useEffect(() => {
    const handleUnreadCountUpdate = (data: any) => {
      console.log('Nhận cập nhật số tin nhắn chưa đọc từ socket:', data);
      
      // Kiểm tra xem dữ liệu có chứa danh sách cuộc trò chuyện không
      if (data.conversations && Array.isArray(data.conversations)) {
        console.log('Cập nhật danh sách cuộc trò chuyện từ socket');
        
        // Cập nhật danh sách cuộc trò chuyện từ socket
        if (data.conversations.length > 0) {
          setConversations(prevConversations => {
            // Tạo bản sao của danh sách cuộc trò chuyện hiện tại
            const updatedConversations = [...prevConversations];
            
            // Cập nhật thông tin cho từng cuộc trò chuyện
            data.conversations.forEach((conversationUpdate: any) => {
              const index = updatedConversations.findIndex(
                c => c.conversation_id === conversationUpdate.conversation_id
              );
              
              if (index !== -1) {
                // Cập nhật số tin nhắn chưa đọc
                updatedConversations[index] = {
                  ...updatedConversations[index],
                  unread_count: conversationUpdate.unread_count
                };
              }
            });
            
            // Sắp xếp danh sách theo thời gian cập nhật mới nhất
            return updatedConversations.sort((a, b) => {
              const timeA = new Date(a.last_message_time || a.updated_at || 0).getTime();
              const timeB = new Date(b.last_message_time || b.updated_at || 0).getTime();
              return timeB - timeA;
            });
          });
        }
      }
    };

    // Lắng nghe sự kiện cập nhật tin nhắn chưa đọc
    socketService.on('unread_count_update', handleUnreadCountUpdate);
    
    // Lắng nghe sự kiện tin nhắn mới để cập nhật danh sách cuộc trò chuyện
    const handleNewMessage = (data: any) => {
      console.log('MessagesSidebar nhận tin nhắn mới:', data);
      
      if (data.sender_id !== userId) {
        // Cập nhật thông tin tin nhắn mới nhất vào cuộc trò chuyện
        setConversations(prevConversations => {
          // Kiểm tra cuộc trò chuyện có tồn tại không
          const conversationExists = prevConversations.some(
            conv => conv.conversation_id === data.conversation_id
          );
          
          // Nếu không tồn tại, gọi API để làm mới danh sách
          if (!conversationExists) {
            console.log('Cuộc trò chuyện mới, làm mới danh sách');
            fetchConversations();
            return prevConversations;
          }
          
          // Nếu tồn tại, chỉ cập nhật cuộc trò chuyện hiện tại
          const updatedConversations = prevConversations.map(conv => {
            if (conv.conversation_id === data.conversation_id) {
              // Tăng số tin nhắn chưa đọc nếu không phải là cuộc trò chuyện hiện tại
              const newUnreadCount = !(currentConversation && 
                currentConversation.conversation_id === data.conversation_id) 
                ? (conv.unread_count || 0) + 1 
                : conv.unread_count;
                
              return {
                ...conv,
                last_message_id: data.message_id,
                last_message_content: data.content,
                last_message_time: data.created_at,
                unread_count: newUnreadCount
              };
            }
            return conv;
          });
          
          // Sắp xếp lại để cuộc trò chuyện có tin nhắn mới nhất lên đầu
          return updatedConversations.sort((a, b) => {
            const timeA = new Date(a.last_message_time || a.updated_at || 0).getTime();
            const timeB = new Date(b.last_message_time || b.updated_at || 0).getTime();
            return timeB - timeA;
          });
        });
      }
    };
    
    socketService.on('new_message', handleNewMessage);
    
    return () => {
      socketService.off('unread_count_update', handleUnreadCountUpdate);
      socketService.off('new_message', handleNewMessage);
    };
  }, [userId, currentConversation, setConversations, fetchConversations]);

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
    unreadBadge: {
      position: 'absolute' as const,
      bottom: '-2px',
      right: '-2px',
      backgroundColor: '#ff3b30',
      color: 'white',
      fontSize: '10px',
      minWidth: '18px',
      height: '18px',
      borderRadius: '9px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '2px solid white',
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
    conversationTime: {
      fontSize: '12px',
      color: '#888',
      whiteSpace: 'nowrap' as const,
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
            {filteredConversations.map((conversation) => (
              <div 
                key={conversation.conversation_id}
                style={{
                  ...styles.conversationItem,
                  ...(currentConversation?.conversation_id === conversation.conversation_id ? styles.conversationItemActive : {})
                }}
                onClick={() => handleSelectConversation(conversation)}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = currentConversation?.conversation_id === conversation.conversation_id ? '#e9f5ff' : '';
                }}
              >
                <div style={styles.conversationAvatar}>
                  {getConversationName(conversation).charAt(0).toUpperCase()}
                  {conversation.unread_count && conversation.unread_count > 0 ? (
                    <div style={styles.unreadBadge}>{conversation.unread_count > 99 ? '99+' : conversation.unread_count}</div>
                  ) : null}
                </div>
                <div style={styles.conversationInfo}>
                  <div style={styles.conversationHeader}>
                    <div style={styles.conversationName}>{getConversationName(conversation)}</div>
                    <div style={styles.conversationTime}>{conversation.last_message_time ? formatTime(conversation.last_message_time) : ''}</div>
                  </div>
                  <div style={styles.conversationLastMessage}>
                    {conversation.last_message_content || 'Bắt đầu cuộc trò chuyện...'}
                  </div>
                </div>
              </div>
            ))}
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