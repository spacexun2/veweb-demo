import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const AITestPage: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [testResult, setTestResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const runTest = async () => {
        setIsLoading(true);
        setError(null);
        setTestResult(null);

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/test-ai`);
            const data = await response.json();
            setTestResult(data);
        } catch (err: any) {
            setError(err.message || '测试失败');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
            {/* Header */}
            <div className="max-w-4xl mx-auto mb-8">
                <button
                    onClick={() => navigate('/')}
                    className="mb-6 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                    ← 返回首页
                </button>

                <h1 className="text-4xl font-bold mb-2">🧪 AI功能测试</h1>
                <p className="text-gray-400">测试VLM图片理解 + AI智能回复完整流程</p>
            </div>

            {/* Test Card */}
            <div className="max-w-4xl mx-auto">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                    {/* Test Info */}
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-4">测试内容</h2>
                        <div className="space-y-2 text-gray-300">
                            <p>✅ 下载测试图片（Audrey Hepburn）</p>
                            <p>✅ VLM分析图片内容</p>
                            <p>✅ AI基于图片生成回复</p>
                            <p>✅ 验证API Key有效性</p>
                        </div>
                    </div>

                    {/* Run Button */}
                    <button
                        onClick={runTest}
                        disabled={isLoading}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 rounded-xl font-bold text-lg transition-all disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-3">
                                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                测试中...
                            </span>
                        ) : (
                            '🚀 开始测试'
                        )}
                    </button>

                    {/* Error */}
                    {error && (
                        <div className="mt-6 p-4 bg-red-900/50 border border-red-500 rounded-lg">
                            <p className="font-semibold">❌ 错误</p>
                            <p className="text-sm mt-1">{error}</p>
                        </div>
                    )}

                    {/* Results */}
                    {testResult && (
                        <div className="mt-6 space-y-4">
                            {/* Status */}
                            <div className={`p-4 rounded-lg border ${testResult.success
                                    ? 'bg-green-900/50 border-green-500'
                                    : 'bg-red-900/50 border-red-500'
                                }`}>
                                <p className="font-bold text-lg">
                                    {testResult.success ? '✅ 测试成功' : '❌ 测试失败'}
                                </p>
                                <p className="text-sm mt-1">退出码: {testResult.exitCode}</p>
                                <p className="text-xs text-gray-400 mt-1">{testResult.timestamp}</p>
                            </div>

                            {/* Output */}
                            {testResult.output && (
                                <div className="bg-black/50 rounded-lg p-4 border border-gray-700">
                                    <p className="font-semibold mb-2">📄 测试输出</p>
                                    <pre className="text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
                                        {testResult.output}
                                    </pre>
                                </div>
                            )}

                            {/* Error Output */}
                            {testResult.error && (
                                <div className="bg-red-900/30 rounded-lg p-4 border border-red-700">
                                    <p className="font-semibold mb-2">⚠️ 错误信息</p>
                                    <pre className="text-xs text-red-300 overflow-x-auto whitespace-pre-wrap">
                                        {testResult.error}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Help */}
                <div className="mt-6 bg-blue-900/30 rounded-lg p-6 border border-blue-500/50">
                    <h3 className="font-bold mb-2">💡 使用说明</h3>
                    <ul className="text-sm text-gray-300 space-y-1">
                        <li>• 此测试会真实调用VLM和AI API（消耗token）</li>
                        <li>• 测试时长约5-10秒</li>
                        <li>• 成功则说明API Key有效，AI服务正常</li>
                        <li>• 失败请检查Railway环境变量配置</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
