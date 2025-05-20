import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import type { Conversation, Message } from '../../services/api';
import socketService from '../../services/socketService';
import { playMessageSound } from '../../utils/sound';

interface MessagesContentProps {
  userId: number;
  currentConversation: Conversation | null;
}

interface MessageStatus {
  type: 'sent' | 'delivered' | 'failed';
}

const MessagesContent: React.FC<MessagesContentProps> = ({ userId, currentConversation }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentConversationIdRef = useRef<number | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Giữ focus vào input khi component mount và sau mỗi lần gửi tin nhắn
  useEffect(() => {
    inputRef.current?.focus();
  }, [currentConversation]);

  // Tải tin nhắn khi chọn cuộc trò chuyện
  useEffect(() => {
    if (currentConversation?.conversation_id) {
      setLoading(true);
      currentConversationIdRef.current = currentConversation.conversation_id;
      
      api.getConversationMessages(currentConversation.conversation_id)
        .then(msgs => {
          // Chỉ cập nhật tin nhắn nếu vẫn đang ở cùng một cuộc trò chuyện
          if (currentConversationIdRef.current === currentConversation.conversation_id) {
            setMessages(msgs);
            setLoading(false);
          }
        })
        .catch(error => {
          console.error('Lỗi khi tải tin nhắn:', error);
          setLoading(false);
        });
    }
  }, [currentConversation]);

  // Lắng nghe sự kiện tin nhắn mới
  useEffect(() => {
    const handleNewMessage = (data: any) => {
      console.log('Nhận tin nhắn mới từ socket:', data);
      
      // Chỉ phát âm thanh khi tin nhắn từ người khác
      if (data.sender_id !== userId) {
        // Phát âm thanh ngay khi nhận được tin nhắn, không quan tâm đến cuộc trò chuyện hiện tại
        playMessageSound();
      }

      if (data.conversation_id === currentConversationIdRef.current) {
        console.log('Thêm tin nhắn mới vào cuộc trò chuyện hiện tại');
        setMessages(prevMessages => [...prevMessages, data]);
        // Luôn cuộn xuống khi có tin nhắn mới
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        console.log('Tin nhắn mới cho cuộc trò chuyện khác:', data.conversation_id);
      }
    };

    socketService.on('new_message', handleNewMessage);
    console.log('Đã đăng ký lắng nghe sự kiện new_message');

    return () => {
      console.log('Hủy đăng ký lắng nghe sự kiện new_message');
      socketService.off('new_message', handleNewMessage);
    };
  }, [currentConversation?.conversation_id, userId]); // Đăng ký lại khi đổi cuộc trò chuyện

  // Lắng nghe sự kiện tin nhắn đã đọc
  useEffect(() => {
    const handleMessageReadReceipt = (data: any) => {
      console.log('Nhận thông báo đã đọc tin nhắn:', data);
      
      if (data.conversation_id === currentConversationIdRef.current) {
        if (data.message_ids && Array.isArray(data.message_ids)) {
          // Trường hợp nhận danh sách tin nhắn cụ thể đã đọc
          setMessages(prevMessages => 
            prevMessages.map(msg => {
              // Nếu tin nhắn nằm trong danh sách message_ids và từ người dùng hiện tại
              if (data.message_ids.includes(msg.message_id) && msg.sender_id === userId) {
                return { ...msg, is_read: true };
              }
              return msg;
            })
          );
        } else {
          // Trường hợp nhận thông báo đã đọc tất cả tin nhắn đến thời điểm cụ thể (read_at)
          const readTime = data.read_at ? new Date(data.read_at) : new Date();
          
          setMessages(prevMessages => 
            prevMessages.map(msg => {
              // Đánh dấu đã đọc cho tất cả tin nhắn từ người dùng hiện tại và gửi trước thời điểm đọc
              if (msg.sender_id === userId && new Date(msg.created_at) <= readTime) {
                return { ...msg, is_read: true };
              }
              return msg;
            })
          );
        }
        
        // Thêm hiệu ứng chuyển động mềm mại khi có tin nhắn được đánh dấu đã đọc
        const messageElements = document.querySelectorAll('.message-status-container');
        messageElements.forEach(el => {
          el.classList.add('status-updated');
          setTimeout(() => el.classList.remove('status-updated'), 1000);
        });
      }
    };

    socketService.on('message_read_receipt', handleMessageReadReceipt);
    console.log('Đã đăng ký lắng nghe sự kiện message_read_receipt');

    return () => {
      console.log('Hủy đăng ký lắng nghe sự kiện message_read_receipt');
      socketService.off('message_read_receipt', handleMessageReadReceipt);
    };
  }, [userId, currentConversation?.conversation_id]);

  // Cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Khi mở cuộc trò chuyện, đánh dấu tất cả tin nhắn chưa đọc là đã đọc
  useEffect(() => {
    // Chỉ xử lý khi có cuộc trò chuyện và có tin nhắn
    if (currentConversation?.conversation_id && messages.length > 0 && userId) {
      const unreadMessages = messages.filter(msg => 
        msg.sender_id !== userId && // Tin nhắn từ người khác
        !msg.is_read // Chưa được đọc
      );

      if (unreadMessages.length > 0) {
        try {
          // Sử dụng API để đánh dấu tất cả tin nhắn là đã đọc
          api.markAllMessagesAsRead(
            currentConversation.conversation_id, 
            userId
          );

          // Cập nhật trạng thái tin nhắn hiện tại
          setMessages(prevMessages => prevMessages.map(msg => {
            if (msg.sender_id !== userId) {
              return { ...msg, is_read: true };
            }
            return msg;
          }));

          // Thông báo cho người gửi biết tin nhắn đã được đọc
          socketService.emit('message_read', {
            conversation_id: currentConversation.conversation_id,
            reader_id: userId,
            message_ids: unreadMessages.map(msg => msg.message_id)
          });
        } catch (error) {
          console.error('Lỗi khi đánh dấu tin nhắn là đã đọc:', error);
        }
      }
    }
  }, [currentConversation?.conversation_id, messages, userId]);

  // Load tin nhắn khi mở cuộc trò chuyện
  useEffect(() => {
    if (currentConversation) {
      setLoading(true);
      currentConversationIdRef.current = currentConversation.conversation_id;

      const loadMessages = async () => {
        try {
          const messages = await api.getConversationMessages(currentConversation.conversation_id);
          setMessages(messages);
          
          // Lấy thông tin trạng thái đã đọc của các tin nhắn
          if (userId) {
            loadReadStatus();
          }
        } catch (error) {
          console.error('Lỗi khi tải tin nhắn từ cuộc trò chuyện:', error);
        } finally {
          setLoading(false);
        }
      };
      
      loadMessages();
    }
  }, [currentConversation, userId]);
  
  // Hàm để tải trạng thái đã đọc của tin nhắn
  const loadReadStatus = async () => {
    if (!currentConversation || !userId) return;
    
    try {
      const response = await api.getMessageReadStatus(currentConversation.conversation_id, userId);
      
      if (response.success && response.read_statuses) {
        // Cập nhật trạng thái đã đọc cho các tin nhắn
        setMessages(prevMessages => 
          prevMessages.map(msg => {
            // Tìm trạng thái đã đọc cho tin nhắn hiện tại
            const readStatus = response.read_statuses.find(
              (status: { message_id: number; is_read: number }) => status.message_id === msg.message_id
            );
            
            if (readStatus && msg.sender_id === userId) {
              return { ...msg, is_read: readStatus.is_read === 1 };
            }
            return msg;
          })
        );
      }
    } catch (error) {
      console.error('Lỗi khi tải trạng thái đã đọc:', error);
    }
  };
  
  // Xử lý mất kết nối và kết nối lại
  useEffect(() => {
    const handleReconnect = () => {
      console.log('Socket kết nối lại - cập nhật trạng thái tin nhắn');
      loadReadStatus();
    };
    
    socketService.on('connect', handleReconnect);
    
    return () => {
      socketService.off('connect', handleReconnect);
    };
  }, [currentConversation?.conversation_id, userId]);

  // Gửi tin nhắn mới
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentConversation || !newMessage.trim() || !userId) {
      return;
    }

    // Khai báo các biến ở phạm vi function
    const tempId = Date.now();
    const messageContent = newMessage.trim();
    
    try {
      setSending(true);

      // Đánh dấu tất cả tin nhắn chưa đọc trong cuộc trò chuyện là đã đọc
      // vì người dùng đang trả lời, điều đó có nghĩa họ đã xem tin nhắn
      const unreadMessages = messages.filter(msg => 
        msg.sender_id !== userId && // Tin nhắn từ người khác
        !msg.is_read // Chưa được đọc
      );

      if (unreadMessages.length > 0) {
        try {
          // Sử dụng API để đánh dấu tất cả tin nhắn là đã đọc
          await api.markAllMessagesAsRead(
            currentConversation.conversation_id, 
            userId
          );

          // Cập nhật trạng thái tin nhắn hiện tại
          setMessages(prevMessages => prevMessages.map(msg => {
            if (msg.sender_id !== userId) {
              return { ...msg, is_read: true };
            }
            return msg;
          }));

          // Thông báo cho người gửi biết tin nhắn đã được đọc
          socketService.emit('message_read', {
            conversation_id: currentConversation.conversation_id,
            reader_id: userId,
            message_ids: unreadMessages.map(msg => msg.message_id)
          });
        } catch (error) {
          console.error('Lỗi khi đánh dấu tin nhắn là đã đọc:', error);
        }
      }
      
      // Tạo đối tượng tin nhắn tạm thời để hiển thị ngay lập tức
      const tempMessage: Message = {
        message_id: tempId as any, // Sử dụng as any để tránh lỗi TypeScript
        conversation_id: currentConversation.conversation_id,
        sender_id: userId,
        sender_name: 'Bạn', // Hiển thị tạm thời
        content: messageContent,
        message_type: 'text',
        created_at: new Date().toISOString(),
        is_read: false
      };
      
      // Thêm tin nhắn tạm vào danh sách hiển thị
      setMessages(prevMessages => [...prevMessages, tempMessage]);
      
      // Xóa nội dung nhập
      setNewMessage('');

      // Cuộn xuống tin nhắn mới
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
      // Thêm timeout để mô phỏng độ trễ mạng (có thể bỏ trong production)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const result = await api.sendMessage({
        conversation_id: currentConversation.conversation_id,
        sender_id: userId,
        content: messageContent
      });
      
      if (result.success && result.data) {
        // Thay thế tin nhắn tạm bằng tin nhắn thật từ server
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            (msg.message_id === tempId) ? result.data : msg
          )
        );
        console.log('Tin nhắn đã được gửi thành công:', result.data);
      } else {
        // Đánh dấu tin nhắn gửi thất bại
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.message_id === tempId ? { ...msg, send_failed: true } : msg
          )
        );
        console.error('Lỗi gửi tin nhắn:', result);
      }
    } catch (error) {
      console.error('Lỗi khi gửi tin nhắn:', error);
      // Đánh dấu tin nhắn tạm là gửi thất bại
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.message_id === tempId ? { ...msg, send_failed: true } : msg
        )
      );
      // Không khôi phục tin nhắn vào ô nhập để người dùng có thể chọn gửi lại từ UI
    } finally {
      setSending(false);
      // Focus lại vào input sau khi gửi
      inputRef.current?.focus();
    }
  };

  // Xử lý phím Enter
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Ngăn không cho xuống dòng
      handleSendMessage(e);
    }
  };

  // Định dạng thời gian
  const formatMessageTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  // Định dạng ngày
  const formatMessageDate = (timeString: string) => {
    const date = new Date(timeString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Hôm nay';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hôm qua';
    } else {
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  };

  // Kiểm tra xem tin nhắn có cần hiển thị ngày không
  const shouldShowDate = (message: Message, index: number) => {
    if (index === 0) return true;
    
    const currentDate = new Date(message.created_at).toDateString();
    const previousDate = new Date(messages[index - 1].created_at).toDateString();
    
    return currentDate !== previousDate;
  };

  // Lấy tên của người gửi
  const getSenderName = (message: Message) => {
    if (message.sender_id === userId) {
      return 'Bạn';
    }
    
    return message.sender_name || 'Người dùng';
  };

  // Kiểm tra xem tin nhắn có phải của mình không
  const isOwnMessage = (message: Message) => {
    return message.sender_id === userId;
  };

  // Kiểm tra xem tin nhắn có cần hiển thị avatar không
  const shouldShowAvatar = (message: Message, index: number) => {
    // Không hiển thị avatar để tin nhắn sát nhau hơn
    return false;
  };

  // Kiểm tra xem tin nhắn có phải là tin nhắn cuối cùng của người dùng
  const isLastMessageFromUser = (message: Message) => {
    if (!isOwnMessage(message)) return false;
    
    // Tìm tin nhắn cuối cùng được gửi bởi người dùng hiện tại
    const lastMessageFromUser = [...messages]
      .reverse()
      .find(msg => msg.sender_id === userId);
      
    return lastMessageFromUser && lastMessageFromUser.message_id === message.message_id;
  };

  // Kiểm tra xem tin nhắn có phải là tin nhắn mới nhất đã được xem không
  const isLastReadMessage = (message: Message) => {
    if (!isOwnMessage(message) || !message.is_read) return false;
    
    // Tìm tin nhắn đã đọc cuối cùng từ người dùng hiện tại
    const userMessages = messages.filter(msg => 
      msg.sender_id === userId && 
      !msg.message_id.toString().includes('temp') // Loại bỏ tin nhắn tạm
    );
    const readMessages = userMessages.filter(msg => msg.is_read);
    
    if (readMessages.length === 0) return false;
    
    // Sắp xếp theo thời gian gửi, lấy tin nhắn mới nhất
    const sortedReadMessages = [...readMessages].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    return sortedReadMessages[0].message_id === message.message_id;
  };

  // Styles cho khung chat
  const styles = {
    messagesContent: {
      display: 'flex',
      flexDirection: 'column' as const,
      height: '100%',
      position: 'relative' as const,
      overflowX: 'hidden' as const, // Ẩn thanh cuộn ngang
      overflowY: 'hidden' as const, // Ẩn thanh cuộn dọc ở container chính
    },
    emptyState: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      margin: 'auto',
      textAlign: 'center' as const,
      padding: '40px 20px',
      flex: 1,
      height: '100%',
      background: '#fbfbfb', // Thêm màu nền nhẹ
    },
    emptyIcon: {
      width: '100px',
      height: '100px',
      margin: '0 auto 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f0f0f0', // Thêm màu nền cho icon
      borderRadius: '50%',
      padding: '15px',
    },
    emptyText: {
      fontWeight: 500,
      fontSize: '18px',
      marginBottom: '10px',
      color: '#333', // Màu đậm hơn cho dễ đọc
    },
    emptyDescription: {
      fontSize: '15px',
      color: '#666', // Màu đậm hơn chút
      maxWidth: '300px',
      lineHeight: '1.5',
    },
    chatArea: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '30px',
      scrollbarWidth: 'thin' as const,
      msOverflowStyle: 'none' as const,
      '&::-webkit-scrollbar': { // CSS cho thanh cuộn webkit
        width: '4px',
      },
      '&::-webkit-scrollbar-track': {
        background: 'transparent',
      },
      '&::-webkit-scrollbar-thumb': {
        background: '#ccc',
        borderRadius: '4px',
      },
    },
    messagesList: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '0',
      paddingBottom: '10px',
    },
    messageDate: {
      textAlign: 'center' as const,
      margin: '4px 0',
      fontSize: '13px',
      color: '#000000',
      fontWeight: 500,
    },
    datePill: {
      backgroundColor: '#f0f0f0',
      padding: '4px 12px',
      borderRadius: '16px',
      display: 'inline-block',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)', // Thêm bóng nhẹ
      color: '#000000',
      fontWeight: 500,
    },
    messageGroup: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '0',
      marginBottom: '0',
    },
    messageRow: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: '1px',
      marginBottom: '0',
      width: '100%',
      padding: '0',
    },
    messageAvatar: {
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      backgroundColor: '#0066ff33',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '11px',
      fontWeight: 'bold',
      color: '#0066ff',
      flexShrink: 0,
    },
    messageContent: {
      display: 'flex',
      flexDirection: 'column' as const,
      maxWidth: '80%',
      width: 'fit-content' as const,
      margin: '0',
    },
    inputArea: {
      padding: '15px',
      borderTop: '1px solid #eaeaea', // Border mỏng hơn
      backgroundColor: 'white',
    },
    inputForm: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      maxHeight: '100px', // Giới hạn chiều cao
    },
    messageInput: {
      flex: 1,
      padding: '12px 15px',
      borderRadius: '24px',
      border: '1px solid #ddd',
      outline: 'none',
      fontSize: '14px',
      backgroundColor: '#f5f5f5',
      maxHeight: '80px', // Giới hạn chiều cao
      overflowY: 'auto' as const,
      color: '#000000', // Màu chữ đen
      caretColor: '#000000', // Màu con trỏ đen
    },
    sendButton: {
      backgroundColor: '#0066ff',
      color: 'white',
      border: 'none',
      borderRadius: '50%',
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    loadingMessages: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: '#888',
    },
    messageBubbleOwn: {
      backgroundColor: '#0066ff',
      color: 'white',
      padding: '6px 10px',
      borderRadius: '18px',
      maxWidth: '100%',
      alignSelf: 'flex-end' as const,
      wordBreak: 'break-word' as const,
      position: 'relative' as const,
      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
      whiteSpace: 'normal' as const,
      overflowWrap: 'break-word' as const,
      display: 'block' as const,
      width: 'fit-content' as const,
      margin: '0',
      fontSize: '13px',
    },
    messageBubbleOther: {
      backgroundColor: '#f0f0f0',
      color: '#333',
      padding: '6px 10px',
      borderRadius: '18px',
      maxWidth: '100%',
      alignSelf: 'flex-start' as const,
      wordBreak: 'break-word' as const,
      position: 'relative' as const,
      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
      whiteSpace: 'normal' as const,
      overflowWrap: 'break-word' as const,
      display: 'block' as const,
      width: 'fit-content' as const,
      margin: '0',
      fontSize: '13px',
    },
    messageTime: {
      fontSize: '9px',
      color: '#999',
      marginTop: '0',
      width: '100%',
      display: 'block' as const,
      textAlign: 'right' as const,
      paddingLeft: '4px',
      paddingRight: '4px',
      opacity: 0,
      transition: 'opacity 0.2s ease-in-out',
      margin: '0',
    },
    messageTimeVisible: {
      opacity: 1,
    },
    messageContainer: {
      display: 'flex',
      flexDirection: 'column' as const,
      position: 'relative' as const,
      cursor: 'default',
    },
    messageStatus: {
      fontSize: '9px',
      color: '#999',
      marginTop: '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: '3px',
      transition: 'all 0.3s ease-in-out',
      opacity: 1,
    },
    statusIcon: {
      width: '14px',
      height: '14px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease',
    },
    statusText: {
      fontSize: '10px',
      color: '#888',
      transition: 'color 0.3s ease',
    },
    statusActive: {
      color: '#0066ff',
    }
  };

  // Hàm render biểu tượng trạng thái
  const renderStatusIcon = (status: 'sending' | 'sent' | 'read' | 'failed') => {
    switch (status) {
      case 'sending':
        return (
          <svg style={styles.statusIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#888" strokeWidth="2" strokeDasharray="30" strokeDashoffset="0">
              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
            </circle>
          </svg>
        );
      case 'sent':
        return (
          <svg style={styles.statusIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12L10 17L19 8" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'read':
        return (
          <svg style={{...styles.statusIcon, color: '#0066ff'}} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 12L7 17L15 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 12L15 17L22 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'failed':
        return (
          <svg style={{...styles.statusIcon, color: '#e74c3c'}} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      default:
        return null;
    }
  };

  // Hàm hiển thị trạng thái tin nhắn
  const renderMessageStatus = (message: Message) => {
    // Tin nhắn người khác sẽ không hiển thị trạng thái
    if (!isOwnMessage(message)) return null;

    // Nếu là tin nhắn tạm thời (đang gửi)
    if (typeof message.message_id === 'string' || message.message_id.toString().includes('temp')) {
      return (
        <div className="message-status-container" style={styles.messageStatus}>
          {renderStatusIcon('sending')}
          <span style={styles.statusText}>Đang gửi</span>
        </div>
      );
    }

    // Nếu tin nhắn có lỗi, hiển thị trạng thái lỗi cho tất cả tin nhắn
    if (message.send_failed) {
      return (
        <div className="message-status-container" style={styles.messageStatus}>
          {renderStatusIcon('failed')}
          <span style={{...styles.statusText, color: '#e74c3c'}}>Gửi không thành công</span>
        </div>
      );
    }

    // Tin nhắn đã được xem - chỉ hiển thị trạng thái tại tin nhắn mới nhất đã được xem
    if (isLastReadMessage(message)) {
      return (
        <div className="message-status-container" style={styles.messageStatus}>
          {renderStatusIcon('read')}
          <span style={{...styles.statusText, ...styles.statusActive}}>Đã xem</span>
        </div>
      );
    }

    // Chỉ hiển thị trạng thái "Đã gửi" cho tin nhắn cuối cùng chưa được xem
    if (isLastMessageFromUser(message) && !message.is_read) {
      return (
        <div className="message-status-container" style={styles.messageStatus}>
          {renderStatusIcon('sent')}
          <span style={styles.statusText}>Đã gửi</span>
        </div>
      );
    }

    // Các tin nhắn khác không hiển thị trạng thái
    return null;
  };

  // Thêm CSS cho hiệu ứng animation
  useEffect(() => {
    // Tạo style element
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      .message-status-container {
        transition: all 0.3s ease-in-out;
      }
      .status-updated {
        animation: pulse 1s ease-in-out;
      }
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
    `;
    document.head.appendChild(styleElement);

    // Cleanup
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Nếu không có cuộc trò chuyện nào được chọn
  if (!currentConversation) {
    return (
      <div className="messages-content" style={styles.messagesContent}>
        <div className="empty-state" style={{
          ...styles.emptyState,
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '40px 20px',
          backgroundColor: '#ffffff',
          textAlign: 'center' as const,
        }}>
          <div className="empty-icon" style={{
            width: '120px',
            height: '120px',
            margin: '0 auto 30px',
            backgroundColor: '#e0e4e8',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}>
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16Z" fill="#222222"/>
              <path d="M12 11H14V13H12V11ZM12 7H14V9H12V7Z" fill="#222222"/>
            </svg>
          </div>
          
          <div style={{
            backgroundColor: '#ffffff',
            padding: '0 0 20px 0',
            width: '100%',
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              color: '#000000',
              fontWeight: 900,
              fontSize: '28px',
              textAlign: 'center',
              padding: '10px 0',
              lineHeight: 1.4,
              fontFamily: 'Arial, sans-serif',
            }}>
              Chào mừng đến với SnakeChat
            </div>
          </div>

          <p style={{
            fontSize: '18px',
            color: '#000000',
            maxWidth: '450px',
            lineHeight: '1.6',
            marginBottom: '30px',
            fontWeight: 500,
          }}>Hãy chọn một cuộc trò chuyện từ danh sách bên trái để bắt đầu trò chuyện hoặc tạo cuộc trò chuyện mới với bạn bè</p>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            marginTop: '10px',
            width: '100%',
            maxWidth: '350px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#e0e6ed',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '16px',
              color: '#000000',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              border: '1px solid #ccd4db',
              fontWeight: 500,
            }}>
              <span style={{ 
                marginRight: '12px', 
                color: '#ffffff',
                backgroundColor: '#0066ff',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
              }}>1</span>
              <span style={{ color: '#000000' }}>Chọn cuộc trò chuyện từ sidebar</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#e0e6ed',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '16px',
              color: '#000000',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              border: '1px solid #ccd4db',
              fontWeight: 500,
            }}>
              <span style={{ 
                marginRight: '12px', 
                color: '#ffffff',
                backgroundColor: '#0066ff',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
              }}>2</span>
              <span style={{ color: '#000000' }}>Bắt đầu nhắn tin</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-content" style={styles.messagesContent}>
      {loading ? (
        <div style={styles.loadingMessages}>Đang tải tin nhắn...</div>
      ) : (
        <>
          <div className="chat-area" style={styles.chatArea}>
            <div className="messages-list" style={styles.messagesList}>
              {messages.map((message, index) => (
                <React.Fragment key={message.message_id}>
                  {shouldShowDate(message, index) && (
                    <div className="message-date" style={styles.messageDate}>
                      <span className="date-pill" style={styles.datePill}>
                        {formatMessageDate(message.created_at)}
                      </span>
                    </div>
                  )}
                  
                  <div 
                    className={`message-row ${isOwnMessage(message) ? 'own-message' : ''}`}
                    style={{
                      ...styles.messageRow,
                      justifyContent: isOwnMessage(message) ? 'flex-end' : 'flex-start',
                      marginBottom: '0',
                      padding: '0',
                    }}
                  >
                    <div 
                      className="message-content" 
                      style={{
                        ...styles.messageContent,
                        alignItems: isOwnMessage(message) ? 'flex-end' : 'flex-start',
                        margin: '0',
                      }}
                      onMouseEnter={() => setHoveredMessageId(message.message_id as number)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                    >
                      <div 
                        className="message-bubble"
                        style={{
                          ...(isOwnMessage(message) ? styles.messageBubbleOwn : styles.messageBubbleOther),
                          marginTop: '0',
                          marginBottom: '0',
                        }}
                      >
                        {message.content}
                      </div>
                      
                      <div 
                        className="message-time" 
                        style={{
                          ...styles.messageTime,
                          textAlign: isOwnMessage(message) ? 'right' : 'left',
                          ...(hoveredMessageId === message.message_id ? styles.messageTimeVisible : {}),
                          margin: '0',
                          padding: '0',
                        }}
                      >
                        {formatMessageTime(message.created_at)}
                      </div>
                      
                      {renderMessageStatus(message)}
                    </div>
                  </div>
                </React.Fragment>
              ))}
              <div ref={messagesEndRef}></div>
            </div>
          </div>
          
          <div className="input-area" style={styles.inputArea}>
            <form style={styles.inputForm} onSubmit={handleSendMessage}>
              <input
                ref={inputRef}
                type="text"
                placeholder="Nhập tin nhắn..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                style={styles.messageInput}
                disabled={sending}
                autoFocus
              />
              <button 
                type="submit" 
                style={{
                  ...styles.sendButton,
                  opacity: !newMessage.trim() || sending ? 0.6 : 1,
                }} 
                disabled={!newMessage.trim() || sending}
              >
                <i className="fas fa-paper-plane"></i>
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default MessagesContent; 