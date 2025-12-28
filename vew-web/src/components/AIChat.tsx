/**
 * AI Chat Overlay Component
 * 
 * Displays AI messages and allows user to respond during recording
 * Supports both text and voice input/output
 */

import React, { useState, useRef, useEffect } from 'react';

// TypeScript declarations for Web Speech API
declare global {
    interface Window {
        webkitSpeechRecognition: any;
        SpeechRecognition: any;
    }
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    trigger?: string;
    priority?: 'high' | 'medium' | 'low';
}

interface AIChatProps {
    messages: ChatMessage[];
    onSendMessage: (message: string) => void;
    isRecording: boolean;
}

export const AIChat: React.FC<AIChatProps> = ({ messages, onSendMessage, isRecording }) => {
    const [inputValue, setInputValue] = useState('');
    const [isMinimized, setIsMinimized] = useState(false);
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

    // Initialize Speech Recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
            const recognition = new SpeechRecognition();

            recognition.lang = 'zh-CN';
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onstart = () => {
                setIsListening(true);
                console.log('[Voice] Listening started');
            };

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                console.log('[Voice] Recognized:', transcript);
                setInputValue(transcript);
                setIsListening(false);
            };

            recognition.onerror = (event: any) => {
                console.error('[Voice] Error:', event.error);
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
                console.log('[Voice] Listening ended');
            };

            recognitionRef.current = recognition;
        }
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Auto-read AI messages when voice mode is on
    useEffect(() => {
        if (isVoiceMode && messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.role === 'assistant') {
                speakText(lastMsg.content);
            }
        }
    }, [messages, isVoiceMode]);

    const speakText = (text: string) => {
        console.log('[AIChat] TTS disabled - using main TTS service instead');
        // Browser TTS disabled - InteractiveRecordPage handles TTS via cloud service

        // if ('speechSynthesis' in window) {
        //     // Cancel any ongoing speech
        //     window.speechSynthesis.cancel();
        //     
        //     // Create utterance
        //     const utterance = new SpeechSynthesisUtterance(text);
        //     utterance.lang = 'zh-CN';
        //     utterance.rate = 1.0;
        //     utterance.pitch = 1.0;
        //     utterance.volume = 1.0; // Keep volume for consistency if uncommented later
        //     
        //     // Speak
        //     window.speechSynthesis.speak(utterance);
        // }
    };

    const stopSpeaking = () => {
        console.log('[AIChat] Stop speaking - no-op, cloud TTS handles this');
        // if ('speechSynthesis' in window) {
        //     window.speechSynthesis.cancel();
        // }
    };

    const toggleVoiceMode = () => {
        const newVoiceMode = !isVoiceMode;
        setIsVoiceMode(newVoiceMode);

        if (!newVoiceMode) {
            // Stop any ongoing speech
            stopSpeaking();
            // Stop listening
            recognitionRef.current?.stop();
            setIsListening(false);
        }
    };

    const startVoiceInput = () => {
        if (recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.start();
            } catch (error) {
                console.error('[Voice] Failed to start:', error);
            }
        }
    };

    const handleSend = () => {
        if (inputValue.trim() && isRecording) {
            onSendMessage(inputValue);
            setInputValue('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const getPriorityColor = (priority?: string) => {
        switch (priority) {
            case 'high': return 'bg-red-50 border-red-200';
            case 'medium': return 'bg-yellow-50 border-yellow-200';
            case 'low': return 'bg-blue-50 border-blue-200';
            default: return 'bg-gray-50 border-gray-200';
        }
    };

    if (isMinimized) {
        return (
            <button
                onClick={() => setIsMinimized(false)}
                className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 flex items-center gap-2"
            >
                🤖 AI助手
                {messages.length > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {messages.length}
                    </span>
                )}
            </button>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col" style={{ height: '500px' }}>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🤖</span>
                    <span className="font-semibold">AI实时助手</span>
                    {isRecording && (
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                            <span className="text-xs">录制中</span>
                        </span>
                    )}
                    {isVoiceMode && (
                        <span className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full">
                            <span className="text-xs">🎤 语音模式</span>
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleVoiceMode}
                        className={`p-1.5 rounded transition-colors ${isVoiceMode ? 'bg-green-500 hover:bg-green-600' : 'bg-white/20 hover:bg-white/30'
                            }`}
                        title={isVoiceMode ? '关闭语音模式' : '开启语音模式'}
                    >
                        🎤
                    </button>
                    <button
                        onClick={() => setIsMinimized(true)}
                        className="text-white hover:bg-white/20 rounded px-2 py-1"
                    >
                        ━
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                        <p className="text-lg mb-2">👋</p>
                        <p>我会在录制时主动提供帮助!</p>
                        <p className="text-xs mt-2">你也可以随时提问</p>
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-lg px-4 py-2 ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white'
                                    : `${getPriorityColor(msg.priority)} border text-gray-800`
                                    }`}
                            >
                                {msg.trigger && (
                                    <div className="text-xs opacity-70 mb-1">
                                        触发: {msg.trigger}
                                    </div>
                                )}
                                <div className="text-sm">{msg.content}</div>
                                <div className="text-xs opacity-60 mt-1">
                                    {new Date(msg.timestamp * 1000).toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 p-3">
                <div className="flex gap-2">
                    {isVoiceMode && (
                        <button
                            onClick={startVoiceInput}
                            disabled={!isRecording || isListening}
                            className={`px-3 py-2 rounded-lg transition-colors ${isListening
                                ? 'bg-red-500 text-white animate-pulse'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                } disabled:bg-gray-100 disabled:cursor-not-allowed`}
                            title="点击说话"
                        >
                            {isListening ? '🎤 听中...' : '🎤'}
                        </button>
                    )}
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={isRecording ? (isVoiceMode ? "点击🎤说话或输入文字..." : "问我任何问题...") : "开始录制后可提问"}
                        disabled={!isRecording}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || !isRecording}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        发送
                    </button>
                </div>
            </div>
        </div>
    );
};
