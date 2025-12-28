/**
 * Streaming Demo Page - 演示LLM流式输出功能
 * 
 * 这是一个简化的页面，专门用于演示和测试streaming功能
 */

import React, { useState, useRef, useEffect } from 'react';
import { RealtimeAIServiceEnhanced } from '../services/realtime-enhanced';
import { StreamingMessageHandler } from '../services/streaming-handler';
import type { StreamingMessage } from '../services/streaming-handler';
import { TTSService } from '../services/tts';

export const StreamingDemoPage: React.FC = () => {
    const [sessionId] = useState(() => `demo_${Date.now()}`);
    const [messages, setMessages] = useState<StreamingMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isAISpeaking, setIsAISpeaking] = useState(false);

    const wsServiceRef = useRef<RealtimeAIServiceEnhanced | null>(null);
    const streamingHandlerRef = useRef<StreamingMessageHandler | null>(null);
    const ttsServiceRef = useRef<TTSService | null>(null);

    // Initialize services
    useEffect(() => {
        console.log('[Demo] Initializing services...');

        // Initialize TTS
        ttsServiceRef.current = new TTSService();

        // Initialize streaming handler
        streamingHandlerRef.current = new StreamingMessageHandler(
            ttsServiceRef.current,
            (msgs) => setMessages(msgs),
            (speaking) => setIsAISpeaking(speaking)
        );

        // Initialize WebSocket
        wsServiceRef.current = new RealtimeAIServiceEnhanced(sessionId);
        wsServiceRef.current.connect((message) => {
            console.log('[Demo] Received message:', message);
            streamingHandlerRef.current?.handleMessage(message);
        });

        setIsConnected(true);

        // Cleanup
        return () => {
            wsServiceRef.current?.disconnect();
        };
    }, [sessionId]);

    const handleSendMessage = () => {
        if (!inputText.trim() || !wsServiceRef.current) {
            return;
        }

        console.log('[Demo] Sending message:', inputText);

        // Add user message to UI
        streamingHandlerRef.current?.addUserMessage(inputText);

        // Send to backend
        wsServiceRef.current.sendMessage(inputText, Date.now() / 1000);

        // Clear input
        setInputText('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            padding: '20px',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            <h1>🚀 Streaming Demo</h1>

            <div style={{
                marginBottom: '10px',
                padding: '10px',
                backgroundColor: isConnected ? '#e8f5e9' : '#ffebee',
                borderRadius: '4px'
            }}>
                <strong>状态:</strong> {isConnected ? '✅ 已连接' : '❌ 未连接'}
                {isAISpeaking && <span style={{ marginLeft: '20px' }}>🔊 AI正在说话...</span>}
                <div style={{ fontSize: '12px', marginTop: '5px', color: '#666' }}>
                    Session ID: {sessionId}
                </div>
            </div>

            {/* Messages */}
            <div style={{
                height: '400px',
                overflowY: 'auto',
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '15px',
                backgroundColor: '#f9f9f9'
            }}>
                {messages.length === 0 && (
                    <div style={{ color: '#999', textAlign: 'center', marginTop: '50px' }}>
                        👋 发送消息开始对话...
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} style={{
                        marginBottom: '15px',
                        display: 'flex',
                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                    }}>
                        <div style={{
                            maxWidth: '70%',
                            padding: '10px 15px',
                            borderRadius: '12px',
                            backgroundColor: msg.role === 'user' ? '#007bff' : '#e9ecef',
                            color: msg.role === 'user' ? 'white' : 'black'
                        }}>
                            <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '5px' }}>
                                {msg.role === 'user' ? '👤 You' : '🤖 AI'}
                                {msg.streaming && <span style={{ marginLeft: '5px' }}>⚡ streaming...</span>}
                            </div>
                            <div style={{ whiteSpace: 'pre-wrap' }}>
                                {msg.content}
                                {msg.streaming && <span className="streaming-cursor">▌</span>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Input */}
            <div style={{ display: 'flex', gap: '10px' }}>
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="输入消息..."
                    disabled={!isConnected}
                    style={{
                        flex: 1,
                        padding: '12px',
                        border: '2px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '14px'
                    }}
                />
                <button
                    onClick={handleSendMessage}
                    disabled={!isConnected || !inputText.trim()}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        cursor: isConnected ? 'pointer' : 'not-allowed',
                        opacity: (isConnected && inputText.trim()) ? 1 : 0.5
                    }}
                >
                    发送
                </button>
            </div>

            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '8px' }}>
                <strong>📝 测试说明:</strong>
                <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
                    <li>输入消息后点击"发送"或按Enter</li>
                    <li>AI会以streaming方式逐字显示回复</li>
                    <li>观察"streaming..."标记和闪烁光标</li>
                    <li>完成后会自动播放TTS</li>
                </ul>
            </div>

            <style>{`
                @keyframes blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0; }
                }
                .streaming-cursor {
                    animation: blink 1s infinite;
                }
            `}</style>
        </div>
    );
};
