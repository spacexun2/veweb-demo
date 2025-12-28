/**
 * Prompt Settings Component
 * 
 * Allows users to customize AI prompts and select scenarios before recording
 */

import React, { useState, useEffect, useRef } from 'react';

interface Scenario {
    name: string;
    description: string;
    focus: string[];
}

interface PromptConfig {
    scenarios: Record<string, Scenario>;
    active_scenario: string;
    vlm_prompts: Record<string, string>;
    trigger_messages: Record<string, any>;
    conversation_prompts: Record<string, string>;
}

interface PromptSettingsProps {
    onConfigChange?: (config: Partial<PromptConfig>) => void;
}

export const PromptSettings: React.FC<PromptSettingsProps> = ({ onConfigChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeScenario, setActiveScenario] = useState('coding');
    const [customPrompt, setCustomPrompt] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Draggable state - default position at top center
    const [position, setPosition] = useState({
        x: (window.innerWidth - 150) / 2,  // Center horizontally (button ~150px wide)
        y: 16  // Top margin
    });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Ref for click outside detection
    const menuRef = useRef<HTMLDivElement>(null);

    const scenarios = {
        coding: { name: '编程开发', icon: '💻', color: 'blue' },
        tutorial: { name: '教程学习', icon: '📚', color: 'green' },
        meeting: { name: '会议记录', icon: '👥', color: 'purple' },
        presentation: { name: '演示讲解', icon: '🎯', color: 'orange' },
        debugging: { name: '问题排查', icon: '🐛', color: 'red' },
        custom: { name: '自定义', icon: '⚙️', color: 'gray' }
    };

    const handleScenarioChange = (scenario: string) => {
        setActiveScenario(scenario);
        if (onConfigChange) {
            onConfigChange({ active_scenario: scenario });
        }
    };

    const handleSaveCustomPrompt = () => {
        if (onConfigChange && customPrompt.trim()) {
            onConfigChange({
                active_scenario: 'custom',
                vlm_prompts: { custom: customPrompt }
            });
        }
        alert('自定义Prompt已保存！');
    };

    // Drag handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        if (isOpen) return; // Don't drag when open
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;

        const newX = Math.max(0, Math.min(window.innerWidth - 150, e.clientX - dragOffset.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.y));

        setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Add/remove global mouse listeners for dragging
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, dragOffset]);

    // Click outside to close menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isOpen]);

    if (!isOpen) {
        return (
            <button
                onMouseDown={handleMouseDown}
                onClick={() => setIsOpen(true)}
                className={`fixed bg-white border border-gray-300 rounded-lg px-4 py-2 shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2 z-40 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'
                    }`}
                style={{
                    left: `${position.x}px`,
                    top: `${position.y}px`
                }}
                title="拖动改变位置，点击打开设置"
            >
                <span>⚙️</span>
                <span className="text-sm font-medium text-gray-900">AI配置</span>
            </button>
        );
    }

    return (
        <div
            ref={menuRef}
            className="fixed bg-white rounded-lg shadow-2xl border border-gray-200 w-96 max-h-[80vh] overflow-hidden flex flex-col z-40"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`
            }}
        >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xl">⚙️</span>
                    <span className="font-semibold">AI Prompt 配置</span>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="text-white hover:bg-white/20 rounded px-2 py-1"
                >
                    ✕
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Scenario Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        选择录制场景
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(scenarios).map(([key, { name, icon }]) => (
                            <button
                                key={key}
                                onClick={() => handleScenarioChange(key)}
                                className={`p-3 rounded-lg border-2 transition-all ${activeScenario === key
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300 bg-white'
                                    }`}
                            >
                                <div className="text-2xl mb-1">{icon}</div>
                                <div className="text-xs font-medium text-gray-900">{name}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Current Scenario Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{scenarios[activeScenario as keyof typeof scenarios].icon}</span>
                        <span className="font-semibold text-sm text-gray-900">
                            当前场景: {scenarios[activeScenario as keyof typeof scenarios].name}
                        </span>
                    </div>
                    <div className="text-xs text-gray-700">
                        {activeScenario === 'coding' && '• AI会监控代码错误、调试行为、性能问题'}
                        {activeScenario === 'tutorial' && '• AI会捕获关键步骤、帮你做笔记、总结要点'}
                        {activeScenario === 'meeting' && '• AI会记录决策、待办事项、标注负责人'}
                        {activeScenario === 'presentation' && '• AI会监控演示流畅度、记录反馈、指出问题'}
                        {activeScenario === 'debugging' && '• AI会分析错误日志、建议调试策略、记录过程'}
                        {activeScenario === 'custom' && '• 使用你自定义的Prompt'}
                    </div>
                </div>

                {/* Advanced Settings */}
                <div>
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                        <span>{showAdvanced ? '▼' : '▶'}</span>
                        <span>高级设置</span>
                    </button>

                    {showAdvanced && (
                        <div className="mt-3 space-y-3">
                            {/* Custom Prompt Editor */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    自定义VLM分析Prompt
                                </label>
                                <textarea
                                    value={customPrompt}
                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                    placeholder="输入自定义的视觉分析提示词...&#10;&#10;例如：&#10;你是UI/UX专家。分析屏幕截图：&#10;1. 界面设计是否美观&#10;2. 用户体验是否流畅&#10;3. 是否有可用性问题"
                                    className="w-full h-32 px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                                />
                                <button
                                    onClick={handleSaveCustomPrompt}
                                    className="mt-2 w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                                >
                                    保存自定义Prompt
                                </button>
                            </div>

                            {/* Trigger Settings */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-2">
                                    触发条件
                                </label>
                                <div className="space-y-2">
                                    {['错误检测', '长时间停留', '页面切换', '调试行为'].map((trigger) => (
                                        <label key={trigger} className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                defaultChecked
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-xs text-gray-700">{trigger}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Sensitivity */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    AI主动性级别
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    defaultValue="3"
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>低（被动）</span>
                                    <span>高（主动）</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Quick Tips */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="text-xs font-medium text-yellow-800 mb-1">💡 提示</div>
                    <ul className="text-xs text-yellow-700 space-y-1">
                        <li>• 不同场景的AI会有不同的关注重点</li>
                        <li>• 自定义Prompt可以让AI更符合你的需求</li>
                        <li>• 调试时可以降低主动性级别</li>
                    </ul>
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
                <button
                    onClick={() => {
                        if (confirm('重置为默认配置？')) {
                            setActiveScenario('coding');
                            setCustomPrompt('');
                            alert('已重置为默认配置');
                        }
                    }}
                    className="w-full text-sm text-gray-600 hover:text-gray-900 py-2"
                >
                    重置为默认配置
                </button>
            </div>
        </div>
    );
};
