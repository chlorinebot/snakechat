import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import type { Conversation, Message } from '../../services/api';
import socketService from '../../services/socketService';
import { playMessageSound } from '../../utils/sound';

interface MessagesContentProps {
  userId: number;
  currentConversation: Conversation | null;
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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [_isSocketConnected, setIsSocketConnected] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  // Hàm tiện ích để cuộn xuống dưới cùng
  const scrollToBottom = useCallback((smooth = false) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      });
    }
  }, []);

  // Giữ focus vào input khi component mount và sau mỗi lần gửi tin nhắn
  useEffect(() => {
    if (!isBlocked) {
      inputRef.current?.focus();
    }
  }, [currentConversation, isBlocked]);

  // Thêm useEffect để duy trì focus sau khi cuộn hoặc các thao tác khác
  useEffect(() => {
    const focusInterval = setInterval(() => {
      if (document.activeElement !== inputRef.current && !isBlocked) {
        inputRef.current?.focus();
      }
    }, 300);

    return () => clearInterval(focusInterval);
  }, [isBlocked]);

  // Thêm xử lý click vào khung chat để giữ focus
  const handleChatAreaClick = () => {
    if (!isBlocked) {
      inputRef.current?.focus();
    }
  };

  // Tải tin nhắn khi chọn cuộc trò chuyện
  useEffect(() => {
    if (currentConversation?.conversation_id) {
      setLoading(true);
      currentConversationIdRef.current = currentConversation.conversation_id;
      console.log('[CONVERSATION] Đã cập nhật currentConversationIdRef:', currentConversationIdRef.current);
      
      const loadMessages = async () => {
        try {
          const msgs = await api.getConversationMessages(currentConversation.conversation_id);
          // Chỉ cập nhật tin nhắn nếu vẫn đang ở cùng một cuộc trò chuyện
          if (currentConversationIdRef.current === currentConversation.conversation_id) {
            console.log('[CONVERSATION] Đã tải', msgs.length, 'tin nhắn cho cuộc trò chuyện', currentConversation.conversation_id);
            setMessages(msgs);
            setLoading(false);
            
            // Luôn cuộn xuống dưới cùng khi tải tin nhắn xong
            setTimeout(() => scrollToBottom(false), 100);
            
            // Đảm bảo socket đã kết nối
            if (userId && !socketService.isConnected()) {
              console.log('[SOCKET] Kết nối socket khi tải tin nhắn mới');
              socketService.connect(userId);
            }
          }
        } catch (error) {
          console.error('[ERROR] Lỗi khi tải tin nhắn:', error);
          setLoading(false);
        }
      };
      
      loadMessages();
    }
  }, [currentConversation, userId, scrollToBottom]);

  // Lắng nghe sự kiện socket connect và disconnect
  useEffect(() => {
    const handleConnect = () => {
      console.log('[SOCKET] Socket đã kết nối');
      setIsSocketConnected(true);
      
      // Khi kết nối lại, tải lại tin nhắn của cuộc trò chuyện hiện tại
      if (currentConversationIdRef.current) {
        console.log('[SOCKET] Kết nối lại thành công, tải lại tin nhắn');
        api.getConversationMessages(currentConversationIdRef.current).then(msgs => {
          setMessages(msgs);
          setTimeout(() => scrollToBottom(false), 100);
        }).catch(error => {
          console.error('[ERROR] Lỗi khi tải lại tin nhắn:', error);
        });
      }
    };
    
    const handleDisconnect = () => {
      console.log('[SOCKET] Socket đã ngắt kết nối');
      setIsSocketConnected(false);
    };
    
    // Đăng ký lắng nghe sự kiện kết nối
    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);
    
    // Kiểm tra trạng thái kết nối hiện tại
    setIsSocketConnected(socketService.isConnected());
    
    return () => {
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
    };
  }, [scrollToBottom]);

  // Lắng nghe sự kiện tin nhắn mới với xử lý cải tiến
  useEffect(() => {
    if (!userId) {
      console.log('[SOCKET] Không có userId, không đăng ký lắng nghe');
      return;
    }
    
    // Đảm bảo socket đã kết nối
    if (!socketService.isConnected()) {
      console.log('[SOCKET] Socket chưa kết nối, đang kết nối...');
      socketService.connect(userId);
    }

    console.log('[SOCKET] Đăng ký lắng nghe sự kiện new_message');
    
    // Định nghĩa hàm xử lý tin nhắn mới
    const handleNewMessage = (data: any) => {
      console.log('[SOCKET] Nhận tin nhắn mới:', data);
      
      // Chỉ phát âm thanh khi tin nhắn từ người khác
      if (data.sender_id !== userId) {
        playMessageSound();
      }

      // Lấy ID cuộc trò chuyện hiện tại từ ref
      const currentConvId = currentConversationIdRef.current;
      console.log('[SOCKET] So sánh conversation_id:', {
        'Tin nhắn từ': data.conversation_id,
        'Cuộc trò chuyện hiện tại': currentConvId
      });

      // Chỉ xử lý tin nhắn cho cuộc trò chuyện hiện tại
      if (data.conversation_id === currentConvId) {
        console.log('[SOCKET] Thêm tin nhắn vào cuộc trò chuyện hiện tại');
        
        // Tạo đối tượng tin nhắn mới
        const newMessage: Message = {
          ...data,
          is_read: data.sender_id === userId ? false : true
        };
        
        // Cập nhật danh sách tin nhắn
        setMessages(prevMessages => {
          // Kiểm tra xem tin nhắn đã tồn tại chưa
          const messageId = typeof newMessage.message_id === 'string' 
            ? newMessage.message_id 
            : newMessage.message_id.toString();
            
          const exists = prevMessages.some(msg => {
            const msgId = typeof msg.message_id === 'string' 
              ? msg.message_id 
              : msg.message_id.toString();
            return msgId === messageId;
          });
          
          if (exists) {
            console.log('[SOCKET] Tin nhắn đã tồn tại, bỏ qua');
            return prevMessages;
          } else {
            console.log('[SOCKET] Thêm tin nhắn mới:', newMessage);
            // Loại bỏ tin nhắn tạm thời nếu có (trong trường hợp người gửi là người dùng hiện tại)
            if (data.sender_id === userId) {
              return prevMessages
                .filter(msg => {
                  const msgId = msg.message_id.toString();
                  return !(msgId.startsWith('temp_') && msg.content === newMessage.content);
                })
                .concat(newMessage);
            }
            return [...prevMessages, newMessage];
          }
        });
        
        // Cuộn xuống dưới khi nhận tin nhắn mới
        setTimeout(() => scrollToBottom(true), 100);
        
        // Đánh dấu đã đọc nếu là tin nhắn từ người khác
        if (data.sender_id !== userId && document.visibilityState === 'visible') {
          console.log('[SOCKET] Đánh dấu tin nhắn đã đọc:', data.message_id);
          
          api.markMessageAsRead(data.message_id)
            .then(() => {
              socketService.emit('message_read', {
                conversation_id: data.conversation_id,
                reader_id: userId,
                message_ids: [data.message_id]
              });
            })
            .catch(err => console.error('[ERROR] Lỗi khi đánh dấu tin nhắn đã đọc:', err));
        }
      } else {
        console.log('[SOCKET] Tin nhắn cho cuộc trò chuyện khác, bỏ qua');
      }
    };

    // Định nghĩa hàm xử lý sự kiện kết nối thành công
    const handleConnectionSuccess = (data: any) => {
      console.log('[SOCKET] Kết nối socket thành công với userId:', data.user_id);
      setIsSocketConnected(true);
      
      // Nếu đã có cuộc trò chuyện hiện tại, đăng ký lắng nghe sự kiện
      if (currentConversationIdRef.current) {
        console.log('[SOCKET] Tải lại tin nhắn sau khi kết nối thành công');
        api.getConversationMessages(currentConversationIdRef.current)
          .then(msgs => {
            if (currentConversationIdRef.current) {
              setMessages(msgs);
              setTimeout(() => scrollToBottom(false), 100);
            }
          })
          .catch(error => {
            console.error('[ERROR] Lỗi khi tải lại tin nhắn:', error);
          });
      }
      
      // Bắt đầu ping định kỳ
      startPinging();
    };
    
    // Ping định kỳ để giữ kết nối socket
    const pingInterval = setInterval(() => {
      if (socketService.isConnected()) {
        console.log('[SOCKET] Gửi ping');
        socketService.emit('ping', { timestamp: new Date().toISOString() });
      }
    }, 30000); // Ping mỗi 30 giây
    
    const startPinging = () => {
      console.log('[SOCKET] Bắt đầu ping định kỳ');
      socketService.emit('ping', { timestamp: new Date().toISOString() });
    };
    
    // Lắng nghe phản hồi ping
    const handlePong = (data: any) => {
      console.log('[SOCKET] Nhận pong từ server:', data);
    };

    // Đăng ký lắng nghe các sự kiện
    socketService.on('new_message', handleNewMessage);
    socketService.on('connection_success', handleConnectionSuccess);
    socketService.on('pong', handlePong);
    
    // Cleanup khi component unmount
    return () => {
      console.log('[SOCKET] Hủy đăng ký lắng nghe các sự kiện');
      socketService.off('new_message', handleNewMessage);
      socketService.off('connection_success', handleConnectionSuccess);
      socketService.off('pong', handlePong);
      clearInterval(pingInterval);
    };
  }, [userId, scrollToBottom]);

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
        setTimeout(() => {
          const messageElements = document.querySelectorAll('.message-status-container');
          messageElements.forEach(el => {
            el.classList.add('status-updated');
            setTimeout(() => el.classList.remove('status-updated'), 1000);
          });
        }, 100);
      }
    };

    socketService.on('message_read_receipt', handleMessageReadReceipt);
    console.log('Đã đăng ký lắng nghe sự kiện message_read_receipt');

    return () => {
      console.log('Hủy đăng ký lắng nghe sự kiện message_read_receipt');
      socketService.off('message_read_receipt', handleMessageReadReceipt);
    };
  }, [userId, currentConversation?.conversation_id]);

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
          ).then(() => {
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
          }).catch(error => {
            console.error('Lỗi khi đánh dấu tin nhắn là đã đọc:', error);
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
  
  // Giữ cập nhật conversation_id trong ref khi có thay đổi
  useEffect(() => {
    if (currentConversation?.conversation_id) {
      console.log('[DEBUG] Cập nhật currentConversationIdRef:', currentConversation.conversation_id);
      currentConversationIdRef.current = currentConversation.conversation_id;
    }
  }, [currentConversation?.conversation_id]);

  // Thêm debug để xác định khi currentConversationIdRef thay đổi
  useEffect(() => {
    console.log('[DEBUG] Giá trị của currentConversationIdRef.current:', currentConversationIdRef.current);
  }, [currentConversationIdRef.current]);

  // Debug theo dõi socket connection
  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log('[SOCKET-STATUS]', 
        socketService.isConnected() ? 
        'Socket đã kết nối' : 
        'Socket chưa kết nối hoặc đã mất kết nối');
    }, 10000); // Kiểm tra mỗi 10 giây
    
    return () => clearInterval(intervalId);
  }, []);

  // Force connect socket khi component được mount
  useEffect(() => {
    if (userId && !socketService.isConnected()) {
      console.log('[SOCKET] Khởi tạo kết nối socket khi component được mount');
      socketService.connect(userId);
    }
  }, [userId]);

  // Kiểm tra trạng thái chặn khi chuyển cuộc trò chuyện
  useEffect(() => {
    if (currentConversation?.conversation_type === 'personal' && currentConversation.members) {
      const otherMember = currentConversation.members.find(member => member.user_id !== userId);
      const otherUserId = otherMember?.user_id;
      if (otherUserId) {
        Promise.all([
          api.checkBlockStatus(userId, otherUserId),
          api.checkBlockStatus(otherUserId, userId)
        ])
        .then(([res1, res2]) => {
          setIsBlocked(!!(res1.isBlocking || res2.isBlocking));
        })
        .catch(error => console.error('[BLOCK] Lỗi kiểm tra trạng thái chặn:', error));
      }
    } else {
      setIsBlocked(false);
    }
  }, [currentConversation, userId]);

  // Gửi tin nhắn mới
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage || !currentConversation || !userId) return;
    
    try {
      setSending(true);
      // Tạo ID tạm thời để theo dõi tin nhắn
      const tempMessageId = `temp_${Date.now()}`;
      
      // Tạo đối tượng tin nhắn tạm thời để hiển thị ngay lập tức
      const tempMessage: Message = {
        message_id: tempMessageId as unknown as number, // Sửa lỗi kiểu dữ liệu
        conversation_id: currentConversation.conversation_id,
        sender_id: userId,
        sender_name: 'Bạn', // Hiển thị tạm thời
        content: trimmedMessage,
        message_type: 'text',
        created_at: new Date().toISOString(),
        is_read: false,
        send_failed: false
      };

      // Thêm tin nhắn tạm thời vào danh sách
      setMessages(prevMessages => [...prevMessages, tempMessage]);
      
      // Đặt lại input
      setNewMessage('');

      // Đảm bảo input vẫn giữ focus
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);

      // Cuộn xuống tin nhắn mới - luôn cuộn khi người dùng gửi tin
      setTimeout(() => scrollToBottom(true), 10);
      
      console.log('[SEND] Gửi tin nhắn đến server...');
      
      // Gửi tin nhắn đến server với tùy chọn thử lại
      const response = await api.sendMessage({
        conversation_id: currentConversation.conversation_id,
        sender_id: userId,
        content: trimmedMessage,
        message_type: 'text'
      }, 3); // Thử lại tối đa 3 lần nếu gặp lỗi mạng
      
      console.log('[SEND] Phản hồi từ server:', response);
      setSending(false);
      
      if (response.success && response.data) {
        // Cập nhật danh sách tin nhắn, thay thế tin nhắn tạm thời
        setMessages(prevMessages => prevMessages.map(msg => {
          const msgId = msg.message_id.toString();
          // So sánh dựa trên chuỗi tempMessageId
          if (msgId === tempMessageId) {
            return response.data;
          }
          return msg;
        }));
        
        console.log('[SEND] Đã cập nhật tin nhắn tạm thời thành tin nhắn chính thức.');
      } else {
        console.error('[SEND] Gửi tin nhắn không thành công:', response);
        // Đánh dấu tin nhắn là thất bại
        setMessages(prevMessages => prevMessages.map(msg => {
          const msgId = msg.message_id.toString();
          if (msgId === tempMessageId) {
            return { ...msg, send_failed: true };
          }
          return msg;
        }));
      }
    } catch (error) {
      console.error('[SEND] Lỗi khi gửi tin nhắn:', error);
      setSending(false);
      
      // Đánh dấu tin nhắn là thất bại
      setMessages(prevMessages => prevMessages.map(msg => {
        // Kiểm tra nếu message_id là chuỗi và bắt đầu bằng 'temp_'
        const msgId = msg.message_id.toString();
        if (typeof msgId === 'string' && msgId.startsWith('temp_')) {
          return { ...msg, send_failed: true };
        }
        return msg;
      }));
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

  // Kiểm tra xem tin nhắn có phải của mình không
  const isOwnMessage = (message: Message) => {
    return message.sender_id === userId;
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
      !msg.message_id.toString().includes('temp_') // Loại bỏ tin nhắn tạm
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
      overflowX: 'hidden' as const,
      overflowY: 'visible' as const,
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
      paddingTop: '0', // Thêm để đảm bảo không có padding trên cùng
      paddingBottom: '0', // Thêm để đảm bảo không có padding dưới cùng
      scrollbarWidth: 'thin' as const,
      msOverflowStyle: 'none' as const,
      height: '100%',
      display: 'flex', // Thêm display flex
      flexDirection: 'column', // Thêm flex-direction column
      '&::-webkit-scrollbar': {
        width: '8px',
      },
      '&::-webkit-scrollbar-track': {
        background: '#f1f1f1',
      },
      '&::-webkit-scrollbar-thumb': {
        background: '#888',
        borderRadius: '4px',
      },
    },
    messagesList: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '0',
      paddingBottom: '10px',
      paddingTop: '30px', // Thêm padding phía trên
      marginTop: 'auto', // Đẩy nội dung xuống dưới cùng
      width: '100%',
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
    if (typeof message.message_id === 'string' || message.message_id.toString().includes('temp_')) {
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
        <div className="message-status-container" style={{...styles.messageStatus, opacity: 1}}>
          {renderStatusIcon('read')}
          <span style={{...styles.statusText, ...styles.statusActive}}>Đã xem</span>
        </div>
      );
    }

    // Chỉ hiển thị trạng thái "Đã gửi" cho tin nhắn cuối cùng chưa được xem
    if (isLastMessageFromUser(message) && !message.is_read) {
      return (
        <div className="message-status-container" style={{...styles.messageStatus, opacity: 1}}>
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

  // Thêm useEffect để tự động làm mới trạng thái đã xem tin nhắn
  useEffect(() => {
    if (!currentConversation?.conversation_id || !userId) return;

    // Hàm để làm mới trạng thái đã đọc tin nhắn
    const refreshReadStatus = async () => {
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
        console.error('Lỗi khi làm mới trạng thái đã đọc:', error);
      }
    };

    // Thiết lập interval để làm mới trạng thái đọc định kỳ (mỗi 5 giây)
    const intervalId = setInterval(() => {
      refreshReadStatus();
    }, 500);

    // Làm mới trạng thái đọc ngay khi component mount
    refreshReadStatus();

    return () => {
      clearInterval(intervalId);
    };
  }, [currentConversation?.conversation_id, userId]);

  // Xử lý cập nhật trạng thái khi người dùng truy cập lại tab
  useEffect(() => {
    // Hàm cập nhật trạng thái khi tab được kích hoạt lại
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentConversation?.conversation_id) {
        console.log('Tab được kích hoạt lại, đang cập nhật trạng thái tin nhắn...');
        
        // Cập nhật trạng thái đọc tin nhắn
        if (userId) {
          loadReadStatus();
        }
        
        // Xử lý các tin nhắn chưa đọc
        const unreadMessages = messages.filter(msg => 
          msg.sender_id !== userId && // Tin nhắn từ người khác
          !msg.is_read // Chưa được đọc
        );

        if (unreadMessages.length > 0) {
          try {
            // Sử dụng API để đánh dấu tất cả tin nhắn là đã đọc
            api.markAllMessagesAsRead(currentConversation.conversation_id, userId)
              .then(() => {
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
              });
          } catch (error) {
            console.error('Lỗi khi đánh dấu tin nhắn là đã đọc:', error);
          }
        }
      }
    };

    // Thêm event listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentConversation?.conversation_id, messages, userId]);

  // Debug: Kiểm tra cập nhật tin nhắn
  useEffect(() => {
    console.log('Danh sách tin nhắn được cập nhật:', messages.length, 'tin nhắn');
    // Log tin nhắn mới nhất nếu có
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      console.log('Tin nhắn mới nhất:', {
        id: latestMessage.message_id,
        content: latestMessage.content,
        time: new Date(latestMessage.created_at).toLocaleString(),
        sender: latestMessage.sender_id === userId ? 'Tôi' : 'Người khác'
      });
    }
  }, [messages, userId]);

  // Tự động làm mới tin nhắn mới trong cuộc trò chuyện hiện tại
  useEffect(() => {
    if (!currentConversation?.conversation_id) return;
    const intervalId = setInterval(() => {
      api.getConversationMessages(currentConversation.conversation_id)
        .then(msgs => setMessages(msgs))
        .catch(error => console.error('Lỗi khi làm mới tin nhắn:', error));
    }, 500); // Làm mới mỗi 0.5 giây

    return () => {
      clearInterval(intervalId);
    };
  }, [currentConversation?.conversation_id]);

  // Tự động cuộn xuống khi có tin nhắn mới và đang ở đáy
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom(false);
    }
  }, [messages, scrollToBottom, isAtBottom]);

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

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      setIsAtBottom(scrollHeight - scrollTop - clientHeight < 50);
    }
  };

  return (
    <div className="messages-content" style={styles.messagesContent}>
      {loading ? (
        <div style={styles.loadingMessages}>Đang tải tin nhắn...</div>
      ) : (
        <>
          <div 
            className="chat-area" 
            style={{
              ...styles.chatArea,
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'scroll',
              height: 'calc(100% - 65px)',
            }} 
            ref={messagesContainerRef} 
            onScroll={handleScroll}
            onClick={handleChatAreaClick}
          >
            <div className="messages-list" style={{
              ...styles.messagesList,
              marginTop: 'auto', // Đẩy nội dung xuống dưới cùng
              width: '100%',
            }}>
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
          
          {isBlocked ? (
            <div className="blocked-chat-message" style={{ ...styles.inputArea, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#e74c3c' }}>
              Không thể gửi tin nhắn. Hai người đã chặn nhau.
            </div>
          ) : (
            <div className="input-area" style={styles.inputArea} onClick={() => inputRef.current?.focus()}>
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
                  onBlur={() => setTimeout(() => inputRef.current?.focus(), 100)}
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
          )}
        </>
      )}
    </div>
  );
};

export default MessagesContent; 