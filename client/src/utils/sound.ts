class SoundManager {
    private static instance: SoundManager;
    private messageSound: HTMLAudioElement | null = null;
    private isSupported: boolean = false;
    private hasInteracted: boolean = false;
    private pendingPlay: boolean = false;

    private constructor() {
        try {
            if (typeof Audio !== 'undefined') {
                this.messageSound = new Audio('/sounds/sound_mess.mp3');
                this.isSupported = true;
                
                // Preload âm thanh
                this.messageSound.load();
                
                // Xử lý lỗi khi load âm thanh
                this.messageSound.onerror = (e) => {
                    console.error('Không thể tải file âm thanh:', e);
                    this.isSupported = false;
                };

                // Lắng nghe sự kiện tương tác của người dùng
                const handleInteraction = () => {
                    if (!this.hasInteracted) {
                        this.hasInteracted = true;
                        // Nếu có yêu cầu phát âm thanh đang chờ
                        if (this.pendingPlay) {
                            this.playSound();
                            this.pendingPlay = false;
                        }
                        // Gỡ bỏ event listener sau khi đã tương tác
                        document.removeEventListener('click', handleInteraction);
                        document.removeEventListener('keydown', handleInteraction);
                    }
                };

                // Thêm event listener cho sự kiện tương tác
                document.addEventListener('click', handleInteraction);
                document.addEventListener('keydown', handleInteraction);
            }
        } catch (error) {
            console.error('Lỗi khi khởi tạo Audio:', error);
            this.isSupported = false;
        }
    }

    public static getInstance(): SoundManager {
        if (!SoundManager.instance) {
            SoundManager.instance = new SoundManager();
        }
        return SoundManager.instance;
    }

    private async playSound(): Promise<void> {
        if (!this.isSupported || !this.messageSound) {
            console.warn('Âm thanh không được hỗ trợ hoặc chưa sẵn sàng');
            return;
        }

        try {
            this.messageSound.currentTime = 0;
            await this.messageSound.play();
            console.log('Đã phát âm thanh thành công');
        } catch (error) {
            if (error instanceof Error && error.name === 'NotAllowedError') {
                console.log('Chưa có tương tác từ người dùng, đánh dấu để phát sau');
                this.pendingPlay = true;
            } else {
                console.error('Lỗi khi phát âm thanh:', error);
            }
        }
    }

    public async playMessageSound(): Promise<void> {
        if (this.hasInteracted) {
            await this.playSound();
        } else {
            console.log('Chưa có tương tác, đánh dấu để phát âm thanh sau');
            this.pendingPlay = true;
        }
    }
}

// Export instance của SoundManager
const soundManager = SoundManager.getInstance();
export const playMessageSound = () => soundManager.playMessageSound(); 