/**
 * Enhanced WebSocket Service for Real-time AI Communication
 * 
 * Features:
 * - Auto-reconnection with exponential backoff
 * - Heartbeat mechanism
 * - Session recovery
 * - Streaming chunk support
 */

export interface AIMessage {
    type: 'ai_message' | 'ai_chunk' | 'ai_complete' | 'ai_response' | 'analysis' | 'error' | 'pong';
    message?: string;
    content?: string;
    full_content?: string;
    chunk_index?: number;
    total_chunks?: number;
    trigger?: string;
    priority?: 'high' | 'medium' | 'low';
    timestamp?: number;
}

export class RealtimeAIServiceEnhanced {
    private ws: WebSocket | null = null;
    private sessionId: string;
    private onMessageCallback: ((message: AIMessage) => void) | null = null;

    // Reconnection state
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 10;
    private reconnectDelay: number = 1000;
    private maxReconnectDelay: number = 30000;
    private reconnectTimer: number | null = null;
    private isIntentionalClose: boolean = false;

    // Heartbeat
    private heartbeatInterval: number | null = null;
    private heartbeatTimeout: number | null = null;
    private readonly HEARTBEAT_INTERVAL = 30000; // 30s
    private readonly HEARTBEAT_TIMEOUT = 30000; // 30s (increased to handle VLM processing)

    constructor(sessionId: string) {
        this.sessionId = sessionId;
    }

    connect(onMessage: (message: AIMessage) => void): void {
        this.onMessageCallback = onMessage;
        this.isIntentionalClose = false;
        this.createConnection();
    }

    private createConnection(): void {
        const url = `ws://localhost:8000/ws/recording/${this.sessionId}`;

        console.log(`[RealtimeAI] 🔌 Connecting... (Attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);

        try {
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                console.log('[RealtimeAI] ✅ Connected successfully');
                this.reconnectAttempts = 0;
                this.reconnectDelay = 1000;
                this.startHeartbeat();
            };

            this.ws.onmessage = (event) => {
                try {
                    const data: AIMessage = JSON.parse(event.data);

                    // Handle heartbeat pong
                    if (data.type === 'pong') {
                        this.handlePong();
                        return;
                    }

                    // Pass message to callback
                    console.log('[RealtimeAI] ✉️  Calling callback with:', data.type);
                    if (this.onMessageCallback) {
                        this.onMessageCallback(data);
                    } else {
                        console.error('[RealtimeAI] ❌ NO CALLBACK SET!');
                    }
                } catch (error) {
                    console.error('[RealtimeAI] ❌ Failed to parse message:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('[RealtimeAI] ⚠️ WebSocket error:', error);
            };

            this.ws.onclose = (event) => {
                console.log(`[RealtimeAI] 🔌 Connection closed (code: ${event.code})`);
                this.stopHeartbeat();

                // Auto-reconnect unless intentionally closed
                if (!this.isIntentionalClose && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.scheduleReconnect();
                } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    console.error('[RealtimeAI] ❌ Max reconnection attempts reached');
                }
            };

        } catch (error) {
            console.error('[RealtimeAI] ❌ Failed to create WebSocket:', error);
            this.scheduleReconnect();
        }
    }

    private scheduleReconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
        const delay = Math.min(
            this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
            this.maxReconnectDelay
        );

        console.log(`[RealtimeAI] 🔄 Reconnecting in ${delay}ms...`);

        this.reconnectTimer = window.setTimeout(() => {
            this.reconnectAttempts++;
            this.createConnection();
        }, delay);
    }

    private startHeartbeat(): void {
        this.stopHeartbeat();

        // Send ping every 30s
        this.heartbeatInterval = window.setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));

                // Set timeout to detect dead connection
                this.heartbeatTimeout = window.setTimeout(() => {
                    console.warn('[RealtimeAI] 💔 Heartbeat timeout - connection dead');
                    this.ws?.close();
                }, this.HEARTBEAT_TIMEOUT);
            }
        }, this.HEARTBEAT_INTERVAL);
    }

    private handlePong(): void {
        // Clear timeout - connection is alive
        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
            this.heartbeatTimeout = null;
        }
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

    sendFrame(frameData: string, timestamp: number): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'frame',
                data: frameData,
                timestamp
            }));
        } else {
            console.warn('[RealtimeAI] ⚠️ Cannot send frame - not connected');
        }
    }

    sendMessage(message: string, timestamp: number): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'user_message',
                message,
                timestamp
            }));
        } else {
            console.warn('[RealtimeAI] ⚠️ Cannot send message - not connected');
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
        console.log('[RealtimeAI] 🔌 Disconnecting...');

        this.isIntentionalClose = true;
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
}
