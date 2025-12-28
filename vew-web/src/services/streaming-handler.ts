/**
 * Streaming AI Message Handler
 * 
 * Handles both regular and streaming AI responses
 * Features:
 * - Incremental chunk accumulation
 * - Auto TTS on complete
 * - Backward compatible
 */

import { TTSService } from './tts';

export interface StreamingMessage {
    id?: string;  // Optional message ID
    role: 'user' | 'assistant';
    content: string;
    timestamp?: number;  // Unix timestamp
    streaming?: boolean;
    trigger?: string;
    priority?: string;
    synthesizedLength?: number; // Track how much has been synthesized for streaming TTS
}

export interface AIChunkMessage {
    type: 'ai_chunk';
    content: string;
    chunk_index: number;
    timestamp: number;
}

export interface AICompleteMessage {
    type: 'ai_complete';
    full_content: string;
    total_chunks: number;
    timestamp: number;
}

export class StreamingMessageHandler {
    private messages: StreamingMessage[] = [];
    private ttsService: TTSService;
    private onMessagesUpdate: (messages: StreamingMessage[]) => void;
    private onAISpeakingChange: (speaking: boolean) => void;

    constructor(
        ttsService: TTSService,
        onMessagesUpdate: (messages: StreamingMessage[]) => void,
        onAISpeakingChange: (speaking: boolean) => void
    ) {
        this.ttsService = ttsService;
        this.onMessagesUpdate = onMessagesUpdate;
        this.onAISpeakingChange = onAISpeakingChange;
    }

    /**
     * Handle incoming AI message (streaming or regular)
     */
    handleMessage(message: any): void {
        // Handle streaming chunk
        if (message.type === 'ai_chunk') {
            this.handleChunk(message as AIChunkMessage);
            return;
        }

        // Handle streaming complete
        if (message.type === 'ai_complete') {
            this.handleComplete(message as AICompleteMessage);
            return;
        }

        // Handle regular AI message (backward compatibility)
        if (message.type === 'ai_message' || message.type === 'ai_response') {
            this.handleRegularMessage(message);
            return;
        }
    }

    private handleChunk(chunk: AIChunkMessage): void {
        const lastMsg = this.messages[this.messages.length - 1];

        if (lastMsg && lastMsg.streaming) {
            // Append to existing streaming message
            lastMsg.content += chunk.content;

            // 真正的流式TTS：每个chunk立即合成，不等待
            // TTS service的queue会确保顺序播放
            if (chunk.content.trim().length > 0) {
                console.log(`[TTS] ⚡ Streaming chunk (${chunk.content.length} chars): "${chunk.content.substring(0, 20)}..."`);
                this.queueChunkTTS(chunk.content);
            }
        } else {
            // Create new streaming message
            this.messages.push({
                role: 'assistant',
                content: chunk.content,
                timestamp: chunk.timestamp,
                streaming: true,
            });
            // For the very first chunk, also queue it for TTS
            if (chunk.content.trim().length > 0) {
                console.log(`[TTS] ⚡ Streaming chunk (first chunk, ${chunk.content.length} chars): "${chunk.content.substring(0, 20)}..."`);
                this.queueChunkTTS(chunk.content);
            }
        }

        // Trigger UI update
        this.onMessagesUpdate([...this.messages]);
    }

    private queueChunkTTS(text: string): void {
        if (!text || text.trim().length === 0) return;

        const startTime = performance.now();
        console.log(`[TTS] 🎵 Queuing ${text.length} chars for synthesis...`);

        // Queue this paragraph for TTS playback
        this.ttsService.play(text, () => {
            // Callback when playing
        }).then(() => {
            const elapsed = performance.now() - startTime;
            console.log(`[TTS] ✅ Synthesis complete in ${elapsed.toFixed(0)}ms`);
        }).catch(err => {
            const elapsed = performance.now() - startTime;
            console.error(`[TTS] ❌ Synthesis failed after ${elapsed.toFixed(0)}ms:`, err);
        });
    }

    private handleComplete(complete: AICompleteMessage): void {
        const lastMsg = this.messages[this.messages.length - 1];

        if (lastMsg && lastMsg.streaming) {
            // Mark as complete
            lastMsg.streaming = false;

            console.log(`[Streaming] ✅ Complete: ${complete.total_chunks} chunks, ${complete.full_content.length} chars`);

            // Synthesize any remaining unsynthesized content
            console.log(`[TTS] AI Complete - ${complete.total_chunks} chunks, ${complete.full_content.length} chars total`);

            // ai_complete时不再合成，因为所有chunks已经合成过了
            // 只需等待TTS queue播放完毕

            // Trigger UI update
            this.onMessagesUpdate([...this.messages]);
        }
    }

    private handleRegularMessage(message: any): void {
        const content = message.message || '';

        this.messages.push({
            role: 'assistant',
            content,
            timestamp: message.timestamp || Date.now() / 1000,
            trigger: message.trigger,
            priority: message.priority
        });

        // Play TTS if not a trigger
        if (content && !message.trigger) {
            this.playTTS(content);
        }

        // Trigger UI update
        this.onMessagesUpdate([...this.messages]);
    }

    private playTTS(content: string): void {
        if (!content || content.trim().length === 0) {
            return;
        }

        this.onAISpeakingChange(true);

        this.ttsService.play(content, (playing) => {
            this.onAISpeakingChange(playing);
        }).catch(err => {
            console.error('[TTS] Play failed:', err);
            this.onAISpeakingChange(false);
        });
    }

    addUserMessage(content: string): void {
        // Stop any ongoing TTS when user sends new message
        this.ttsService.stop();

        this.messages.push({
            role: 'user',
            content,
            timestamp: Date.now() / 1000
        });

        this.onMessagesUpdate([...this.messages]);
    }

    getMessages(): StreamingMessage[] {
        return [...this.messages];
    }

    clearMessages(): void {
        this.messages = [];
        this.onMessagesUpdate([]);
    }
}
