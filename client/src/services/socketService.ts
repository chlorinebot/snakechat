import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private static instance: SocketService | null = null;
  private userId: number | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private eventListeners: Map<string, Set<(...args: any[]) => void>> = new Map();

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public connect(userId: number): void {
    // Lưu userId để sử dụng khi tái kết nối
    this.userId = userId;

    // Nếu đã có socket và đã kết nối, không cần kết nối lại
    if (this.socket && this.socket.connected) {
      console.log('[SOCKET-SERVICE] Socket đã kết nối, không cần kết nối lại');
      return;
    }

    // Đóng socket cũ nếu có
    if (this.socket) {
      console.log('[SOCKET-SERVICE] Đóng socket cũ trước khi tạo kết nối mới');
      this.socket.disconnect();
    }

    console.log(`[SOCKET-SERVICE] Đang kết nối socket với userId: ${userId}`);
    
    // Tạo socket mới với các tùy chọn tái kết nối
    this.socket = io('http://localhost:5000', {
      query: { userId },
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    // Thiết lập các sự kiện cơ bản
    this.setupSocketEvents();
    
    // Đặt lại số lần thử kết nối
    this.reconnectAttempts = 0;
  }

  private setupSocketEvents(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[SOCKET-SERVICE] Kết nối socket thành công');
      
      // Đặt lại số lần thử kết nối
      this.reconnectAttempts = 0;
      
      // Đăng ký lại tất cả các sự kiện đã lưu
      this.reattachEventListeners();
    });

    this.socket.on('connect_error', (error) => {
      console.error('[SOCKET-SERVICE] Lỗi kết nối socket:', error);
      this.handleReconnect();
    });

    this.socket.on('disconnect', (reason) => {
      console.warn(`[SOCKET-SERVICE] Socket bị ngắt kết nối: ${reason}`);
      
      // Nếu không phải do người dùng chủ động ngắt kết nối, thử kết nối lại
      if (reason !== 'io client disconnect') {
        this.handleReconnect();
      }
    });
  }

  private handleReconnect(): void {
    // Tăng số lần thử kết nối
    this.reconnectAttempts++;
    
    console.log(`[SOCKET-SERVICE] Đang thử kết nối lại (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    // Nếu chưa vượt quá số lần thử tối đa, thử kết nối lại
    if (this.reconnectAttempts <= this.maxReconnectAttempts && this.userId) {
      setTimeout(() => {
        console.log('[SOCKET-SERVICE] Thử kết nối lại...');
        this.connect(this.userId!);
      }, Math.min(1000 * this.reconnectAttempts, 5000)); // Thời gian chờ tăng dần, tối đa 5s
    } else {
      console.error('[SOCKET-SERVICE] Đã vượt quá số lần thử kết nối lại');
    }
  }

  private reattachEventListeners(): void {
    if (!this.socket) return;
    
    // Đăng ký lại tất cả các sự kiện đã lưu
    this.eventListeners.forEach((callbacks, event) => {
      callbacks.forEach(callback => {
        console.log(`[SOCKET-SERVICE] Đăng ký lại sự kiện: ${event}`);
        this.socket?.on(event, callback);
      });
    });
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.userId = null;
    // Xóa tất cả event listeners
    this.eventListeners.clear();
  }

  public isConnected(): boolean {
    return this.socket !== null && this.socket.connected;
  }

  public on(event: string, callback: (...args: any[]) => void): void {
    // Lưu callback vào danh sách để có thể đăng ký lại khi tái kết nối
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(callback);
    
    // Đăng ký sự kiện nếu socket đã kết nối
    if (this.socket) {
      console.log(`[SOCKET-SERVICE] Đăng ký sự kiện: ${event}`);
      this.socket.on(event, callback);
    } else {
      console.warn(`[SOCKET-SERVICE] Socket chưa kết nối, sẽ đăng ký sự kiện ${event} khi kết nối thành công`);
      
      // Thử kết nối lại nếu có userId
      if (this.userId) {
        console.log('[SOCKET-SERVICE] Thử kết nối lại để đăng ký sự kiện');
        this.connect(this.userId);
      }
    }
  }

  public off(event: string, callback?: (...args: any[]) => void): void {
    // Xóa callback khỏi danh sách
    if (callback && this.eventListeners.has(event)) {
      this.eventListeners.get(event)?.delete(callback);
    } else if (!callback && this.eventListeners.has(event)) {
      this.eventListeners.delete(event);
    }
    
    // Hủy đăng ký sự kiện nếu socket đã kết nối
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  public emit(event: string, data: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`[SOCKET-SERVICE] Không thể gửi sự kiện ${event} khi socket không kết nối`);
      
      // Thử kết nối lại nếu có userId
      if (this.userId) {
        console.log('[SOCKET-SERVICE] Thử kết nối lại để gửi sự kiện');
        this.connect(this.userId);
        
        // Thử gửi lại sau khi kết nối
        setTimeout(() => {
          if (this.socket && this.socket.connected) {
            console.log(`[SOCKET-SERVICE] Gửi lại sự kiện ${event} sau khi kết nối`);
            this.socket.emit(event, data);
          }
        }, 1000);
      }
    }
  }
}

export default SocketService.getInstance(); 