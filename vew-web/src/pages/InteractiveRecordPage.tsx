/**
 * Interactive Recording Page - 交互式屏幕录制
 * 
 * 实时AI语音对话 + 屏幕录制功能
 * 基于StreamingDemoPage，添加屏幕录制和Frame分析
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { RealtimeAIServiceEnhanced } from '../services/realtime-enhanced';
import { StreamingMessageHandler } from '../services/streaming-handler';
import type { StreamingMessage } from '../services/streaming-handler';
import { TTSService } from '../services/tts';
import { ScreenRecorder } from '../services/recorder';
import { VoiceRecognitionService } from '../services/voice';

export const InteractiveRecordPage: React.FC = () => {
    const navigate = useNavigate();

    // Session
    const [sessionId] = useState(() => `record_${Date.now()}`);

    const [messages, setMessages] = useState<StreamingMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isAISpeaking, setIsAISpeaking] = useState(false);
    const displayMessagesRef = useRef<Array<{ id: string; role: string; content: string; timestamp: number }>>([]);

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isMicOn, setIsMicOn] = useState(false);

    // Upload State
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // AI Error State
    const [wsError, setWsError] = useState<string | null>(null);

    // Pending transcript state (for ASR accumulation)
    const [pendingTranscript, setPendingTranscript] = useState('');
    const [showPendingUI, setShowPendingUI] = useState(false);
    const transcriptTimerRef = useRef<number | null>(null);

    // Chat Panel State - positioned from bottom-right
    const [chatPosition, setChatPosition] = useState(() => ({
        x: typeof window !== 'undefined' ? window.innerWidth - 384 - 16 : 800, // right: 16px
        y: typeof window !== 'undefined' ? window.innerHeight - 500 - 16 : 100  // bottom: 16px
    }));
    const [chatSize, setChatSize] = useState({ width: 384, height: 500 }); // w-96 = 384px
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // Refs
    const wsServiceRef = useRef<RealtimeAIServiceEnhanced | null>(null);
    const streamingHandlerRef = useRef<StreamingMessageHandler | null>(null);
    const ttsServiceRef = useRef<TTSService | null>(null);
    const recorderRef = useRef<ScreenRecorder | null>(null);
    const voiceServiceRef = useRef<VoiceRecognitionService | null>(null);
    const frameIntervalRef = useRef<number | null>(null);
    const recordingStartTime = useRef<number>(0);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Initialize services on mount
    useEffect(() => {
        console.log('[InteractiveRecord] Initializing services...');

        // Initialize TTS
        ttsServiceRef.current = new TTSService();

        // Initialize streaming handler with callback to update displayMessages
        streamingHandlerRef.current = new StreamingMessageHandler(
            ttsServiceRef.current,
            (msgs) => {
                setMessages(msgs);
                // Update displayMessages for conversation history - preserve original timestamps
                const updatedMessages = msgs.map((m, idx) => ({
                    id: m.id || `msg-${idx}`,
                    role: m.role,
                    content: m.content,
                    timestamp: m.timestamp || (Date.now() / 1000)
                }));
                displayMessagesRef.current = updatedMessages; // Only use ref now
            },
            (speaking) => setIsAISpeaking(speaking)
        );

        // DISABLED for HTTP chat:         // Initialize WebSocket
        // DISABLED for HTTP chat:         wsServiceRef.current = new RealtimeAIServiceEnhanced(sessionId);
        // DISABLED for HTTP chat:         wsServiceRef.current.connect((message) => {
        // DISABLED for HTTP chat:             console.log('[InteractiveRecord] Received message:', message);
        // DISABLED for HTTP chat:             streamingHandlerRef.current?.handleMessage(message);
        // DISABLED for HTTP chat:         });
        // DISABLED for HTTP chat: 
        // DISABLED for HTTP chat:         setIsConnected(true);

        // Initialize voice service
        voiceServiceRef.current = new VoiceRecognitionService();

        // Cleanup
        return () => {
            wsServiceRef.current?.disconnect();
            stopRecording();
        };
    }, [sessionId]);

    // Update recording timer
    useEffect(() => {
        if (!isRecording) {
            setRecordingTime(0);
            return;
        }

        const interval = setInterval(() => {
            setRecordingTime(Math.floor((Date.now() - recordingStartTime.current) / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [isRecording]);

    // Auto voice recognition control
    useEffect(() => {
        if (isRecording && isMicOn && !isAISpeaking) {
            if (voiceServiceRef.current && !voiceServiceRef.current.isActive()) {
                console.log('[Voice] Starting...');
                voiceServiceRef.current.start(handleVoiceTranscript, (err) => {
                    console.error('[Voice] Error:', err);
                });
            }
        } else {
            if (voiceServiceRef.current && voiceServiceRef.current.isActive()) {
                console.log('[Voice] Stopping...');
                voiceServiceRef.current.stop();
            }
        }
    }, [isRecording, isMicOn, isAISpeaking]);

    // Voice transcript handler - with accumulation to fix truncation
    const handleVoiceTranscript = (transcript: string, isFinal: boolean) => {
        if (isFinal && transcript.trim()) {
            console.log('[Voice] Final transcript:', transcript);

            // Accumulate transcript
            setPendingTranscript(prev => prev + transcript);
            setShowPendingUI(true);

            // Clear existing timer
            if (transcriptTimerRef.current) {
                clearTimeout(transcriptTimerRef.current);
            }

            // Auto-send after 2 seconds of silence
            transcriptTimerRef.current = window.setTimeout(() => {
                setPendingTranscript(current => {
                    if (current.trim()) {
                        console.log('[Voice] Sending accumulated:', current);
                        handleSendMessageHTTP(current);
                    }
                    return '';
                });
                setShowPendingUI(false);
            }, 5000); // Extended from 2s to 5s
        }
    };

    // Send pending transcript immediately
    const sendPendingNow = () => {
        if (transcriptTimerRef.current) {
            clearTimeout(transcriptTimerRef.current);
        }
        if (pendingTranscript.trim()) {
            handleSendMessageHTTP(pendingTranscript);
            setPendingTranscript('');
            setShowPendingUI(false);
        }
    };

    // HTTP-based AI chat (alternative to WebSocket)
    const handleSendMessageHTTP = async (text?: string) => {
        const messageText = text || inputText;
        if (!messageText.trim()) return;

        console.log('[Chat HTTP] Sending:', messageText);

        const userMsg = {
            id: `msg-${Date.now()}`,
            role: 'user' as const,
            content: messageText,
            timestamp: Date.now() / 1000
        };

        displayMessagesRef.current.push(userMsg);
        setMessages(prev => [...prev, { role: 'user', content: messageText, id: userMsg.id, timestamp: userMsg.timestamp }]);
        setInputText('');

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: messageText, history: displayMessagesRef.current })
            });

            const data = await res.json();

            if (data.success && data.reply) {
                const aiMsg = {
                    id: `msg-${Date.now()}`,
                    role: 'assistant' as const,
                    content: data.reply,
                    timestamp: Date.now() / 1000
                };

                displayMessagesRef.current.push(aiMsg);
                setMessages(prev => [...prev, { role: 'assistant', content: data.reply, id: aiMsg.id, timestamp: aiMsg.timestamp }]);
            }
        } catch (error) {
            console.error('[Chat HTTP] Error:', error);
        }
    };

    // Start recording
    const startRecording = async () => {
        try {
            console.log('[Recording] Starting...');

            // 1. Start screen recorder
            recorderRef.current = new ScreenRecorder();
            await recorderRef.current.startRecording();

            // 2. Get stream for preview
            const stream = recorderRef.current.getStream();
            if (videoRef.current && stream) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }

            // 2. Start frame capture for VLM analysis
            startFrameCapture();

            // 3. Update state
            setIsRecording(true);
            recordingStartTime.current = Date.now();

            console.log('[Recording] Started successfully');
        } catch (err) {
            console.error('[Recording] Failed to start:', err);
            alert(`录制失败: ${err}`);
        }
    };

    // Start frame capture
    const startFrameCapture = () => {
        frameIntervalRef.current = window.setInterval(() => {
            if (!videoRef.current) return;

            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.drawImage(videoRef.current, 0, 0);

            // Convert canvas to base64 for WebSocket
            const base64Data = canvas.toDataURL('image/jpeg', 0.8);
            if (wsServiceRef.current) {
                wsServiceRef.current.sendFrame(base64Data, Date.now() / 1000);
            }
        }, 1000); // Send frame every second
    };

    // Stop recording
    const stopRecording = async () => {
        // Guard: prevent duplicate stops
        if (!isRecording || !recorderRef.current) {
            console.log('[Recording] Stop called but not recording, ignoring');
            return;
        }

        try {
            console.log('[Recording] Stopping...');

            // Set false immediately to prevent re-entry
            setIsRecording(false);

            // Stop frame capture
            if (frameIntervalRef.current) {
                clearInterval(frameIntervalRef.current);
                frameIntervalRef.current = null;
            }

            // Stop recorder and get blob
            let blob: Blob | null = null;
            if (recorderRef.current) {
                blob = await recorderRef.current.stopRecording();
                console.log('[Recording] Stopped, blob size:', blob.size);
            }

            // Stop video preview
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }

            // End WebSocket session
            if (wsServiceRef.current) {
                wsServiceRef.current.endSession();
            }

            // Calculate duration
            const duration = (Date.now() - recordingStartTime.current) / 1000;
            console.log('[Recording] Duration:', duration, 's');

            // Save to store and navigate to CompletePage for upload
            if (blob && blob.size > 0) {
                const { setRecordedBlob, setRecordingDuration } = useStore.getState();
                setRecordedBlob(blob);
                setRecordingDuration(duration);

                console.log('[Recording] Saved to store, navigating to /complete');
                navigate('/complete');
            } else {
                console.warn('[Recording] No video data');
                if (duration > 2) {
                    alert('录制时间太短，没有可保存的内容');
                }
                navigate('/');
            }
        } catch (error) {
            console.error('[Recording] Error during stop:', error);
            setIsRecording(false);
            alert(`停止录制时出错: ${error}\n\n录制内容可能未保存`);
            navigate('/');
        }
    };

    // Toggle microphone
    const toggleMicrophone = () => {
        setIsMicOn(!isMicOn);
    };

    // Send message

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessageHTTP();
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')} `;
    };

    // Drag and resize handlers
    const handleDragStart = (e: React.MouseEvent) => {
        setIsDragging(true);
        // Store offset from mouse to panel's current top-left
        setDragStart({
            x: e.clientX - chatPosition.x,
            y: e.clientY - chatPosition.y
        });
    };

    const handleResizeStart = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsResizing(true);
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    // Mouse move and up handlers
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                // Calculate new position (from top-left)
                const newX = e.clientX - dragStart.x;
                const newY = e.clientY - dragStart.y;
                setChatPosition({
                    x: Math.max(0, Math.min(window.innerWidth - chatSize.width, newX)),
                    y: Math.max(0, Math.min(window.innerHeight - chatSize.height, newY))
                });
            } else if (isResizing) {
                // Mouse moved right/down = increase size
                const deltaX = e.clientX - dragStart.x;
                const deltaY = e.clientY - dragStart.y;
                setChatSize({
                    width: Math.max(300, chatSize.width + deltaX),
                    height: Math.max(400, chatSize.height + deltaY)
                });
                setDragStart({ x: e.clientX, y: e.clientY });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };

        if (isDragging || isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, isResizing, dragStart, chatSize, chatPosition]);

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header */}
            <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">🤖 AI互动录制</h1>
                        <p className="text-sm text-gray-400 mt-1">实时屏幕录制 + AI智能辅助</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* AI Service Status */}
                        <div className="flex items-center gap-2">
                            <span className={`w - 2 h - 2 rounded - full ${isConnected ? 'bg-green-500' : 'bg-gray-500 animate-pulse'
                                } `}></span>
                            <span className="text-sm text-gray-400">
                                {isConnected ? 'AI已连接' : '连接中...'}
                            </span>
                        </div>

                        {/* Recording Time */}
                        {isRecording && (
                            <div className="bg-red-600/20 border border-red-600/50 px-4 py-2 rounded-lg flex items-center gap-2">
                                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                                <span className="font-mono text-lg">{formatTime(recordingTime)}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Video Preview with Controls Overlay */}
                <div className="relative mb-6">
                    {/* Voice & AI Control Panel */}
                    {isRecording && (
                        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                            {/* Microphone Toggle */}
                            <button
                                onClick={toggleMicrophone}
                                className={`px - 4 py - 2 rounded - lg font - medium transition - all ${isMicOn
                                    ? 'bg-green-500 hover:bg-green-600 text-white'
                                    : 'bg-gray-600 hover:bg-gray-700 text-gray-300'
                                    } `}
                            >
                                {isMicOn ? '🎤 麦克风已开启' : '🎙️ 麦克风已关闭'}
                            </button>

                            {/* AI Speaking Indicator */}
                            {isAISpeaking && (
                                <div className="px-4 py-2 bg-purple-500 text-white rounded-lg animate-pulse">
                                    🔊 AI正在说话...
                                </div>
                            )}
                        </div>
                    )}

                    <div className="bg-black rounded-lg overflow-hidden">
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full"
                            style={{ maxHeight: '70vh' }}
                        />
                        {!isRecording && (
                            <div className="aspect-video flex items-center justify-center">
                                <div className="text-center text-gray-500">
                                    <div className="text-4xl mb-2">🎥</div>
                                    <p>点击下方按钮开始录制</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                    {!isRecording ? (
                        <button
                            onClick={startRecording}
                            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors flex items-center gap-3"
                        >
                            <span className="text-2xl">⏺</span>
                            开始AI互动录制
                        </button>
                    ) : (
                        <button
                            onClick={stopRecording}
                            className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors flex items-center gap-3"
                        >
                            <span className="text-2xl">⏹</span>
                            停止录制
                        </button>
                    )}

                    <button
                        onClick={() => navigate('/')}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-4 rounded-lg transition-colors"
                    >
                        返回主页
                    </button>
                </div>
            </div>


            {/* AI Chat Panel - Draggable and resizable */}
            <div
                className="fixed z-50"
                style={{
                    left: `${chatPosition.x}px`,
                    top: `${chatPosition.y}px`,
                    width: `${chatSize.width}px`,
                    height: `${chatSize.height}px`,
                    cursor: isDragging ? 'grabbing' : 'default'
                }}
            >
                <div className="w-full h-full bg-gray-800 rounded-xl shadow-2xl border border-gray-700 flex flex-col overflow-hidden" style={{ position: 'relative' }}>
                    {/* Chat Header - Draggable */}
                    <div
                        className="px-4 py-3 bg-gray-700 border-b border-gray-600 flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
                        onMouseDown={handleDragStart}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-lg">💬</span>
                            <span className="font-semibold">AI对话</span>
                        </div>
                        <div className="text-xs text-gray-400">
                            {messages.length} 条消息
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.length === 0 && (
                            <div className="text-center text-gray-500 mt-8">
                                <div className="text-3xl mb-2">👋</div>
                                <p className="text-sm">开始对话吧！</p>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} `}
                            >
                                <div
                                    className={`max - w - [80 %] px - 4 py - 2 rounded - lg ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-100'
                                        } `}
                                >
                                    <div className="text-xs opacity-70 mb-1">
                                        {msg.role === 'user' ? '你' : 'AI'}
                                        {msg.streaming && ' ⚡'}
                                    </div>
                                    <div className="whitespace-pre-wrap break-words">
                                        {msg.content}
                                        {msg.streaming && <span className="inline-block w-1 h-4 bg-current ml-1 animate-pulse" />}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-gray-700 border-t border-gray-600">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="输入消息..."
                                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                            />
                            <button
                                onClick={() => handleSendMessageHTTP()}
                                disabled={!inputText.trim()}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                            >
                                发送
                            </button>
                        </div>
                    </div>

                    {/* Resize Handle */}
                    <div
                        className="absolute w-4 h-4 cursor-nwse-resize"
                        onMouseDown={handleResizeStart}
                        style={{
                            bottom: 0,
                            right: 0,
                            background: 'linear-gradient(135deg, transparent 0%, transparent 50%, rgba(156, 163, 175, 0.8) 50%, rgba(156, 163, 175, 0.8) 100%)'
                        }}
                    />
                </div>

                {/* Pending Transcript UI - Fixed position */}
                {showPendingUI && pendingTranscript && (
                    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-white border-2 border-blue-500 px-4 py-3 rounded-lg shadow-lg z-50 max-w-md">
                        <div className="flex items-start gap-3">
                            <div className="flex-1">
                                <p className="text-xs text-gray-500 font-semibold mb-1">🎤 语音识别中:</p>
                                <p className="text-sm font-medium text-gray-900">{pendingTranscript}</p>
                                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                                    5秒后自动发送...
                                </p>
                            </div>
                            <button
                                onClick={sendPendingNow}
                                className="bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 text-sm font-medium transition-colors flex-shrink-0"
                            >
                                立即发送
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
