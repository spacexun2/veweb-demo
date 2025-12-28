/**
 * WebSocket Service for Real-time AI Communication
 * 
 * Handles bidirectional communication with FastAPI real-time service
 */

export interface AIMessage {
    type: 'ai_message' | 'ai_response' | 'analysis' | 'error' | 'session_ended';
    message?: string;
    trigger?: string;
    priority?: 'high' | 'medium' | 'low';
    timestamp?: number;
    aks_metadata?: any;
    actions?: any;
    summary?: any;
}

export class RealtimeAIService {
    private ws: WebSocket | null = null;
    private sessionId: string = '';
    private onMessageCallback: ((data: any) => void) | null = null;

    // Reconnection state
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 10;
    private reconnectDelay: number = 1000; // Start with 1s
    private maxReconnectDelay: number = 30000; // Max 30s
    private reconnectTimer: number | null = null;
    private isIntentionalClose: boolean = false;

    // Heartbeat
    private heartbeatInterval: number | null = null;
    private heartbeatTimeout: number | null = null;
    private readonly HEARTBEAT_INTERVAL = 30000; // 30s
    private readonly HEARTBEAT_TIMEOUT = 10000; // 10s
    private onErrorCallback: ((error: Error) => void) | null = null;

    constructor(sessionId: string) {
        this.sessionId = sessionId;
    }

    connect(
        onMessage: (message: AIMessage) => void,
        onError?: (error: Error) => void
    ): void {
        this.onMessageCallback = onMessage;
        this.onErrorCallback = onError || null;
        this.attemptReconnect();
    }

    private attemptReconnect(): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[WebSocket] Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

            setTimeout(() => {
                if (this.onMessageCallback) {
                    this.connect(this.onMessageCallback, this.onErrorCallback || undefined);
                }
            }, 2000 * this.reconnectAttempts); // Exponential backoff
        } else {
            console.error('[WebSocket] Max reconnection attempts reached');
            if (this.onErrorCallback) {
                this.onErrorCallback(new Error('Failed to reconnect to AI service'));
            }
        }
    }

    sendFrame(frameData: string, timestamp: number): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'frame',
                data: frameData,
                timestamp
            }));
        }
    }

    sendMessage(message: string, timestamp: number): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'user_message',
                message,
                timestamp
            }));
        }
    }

    endSession(): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'end_session'
            }));
        }
    }

    disconnect(): void {
        console.log('[Realtime] Disconnecting...');

        this.isIntentionalClose = true; // Prevent auto-reconnect
        this.stopHeartbeat();

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
            this.heartbeatTimeout = null;
        }
    }
}
