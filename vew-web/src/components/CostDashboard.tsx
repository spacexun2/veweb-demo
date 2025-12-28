import React, { useState, useEffect } from 'react';

interface APIStats {
    total_calls: number;
    total_cost: number;
    by_api: {
        [key: string]: {
            calls: number;
            cost: number;
        };
    };
}

const CostDashboard: React.FC = () => {
    const [stats, setStats] = useState<APIStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
        // Refresh every 30 seconds
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/cost-stats');
            const data = await response.json();
            setStats(data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch cost stats:', error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                <p className="text-red-400">无法加载成本数据</p>
            </div>
        );
    }

    const apiNames: { [key: string]: string } = {
        'paraformer': 'Paraformer ASR',
        'qwen_vl': 'Qwen-VL 视觉',
        'qwen_tts': 'Qwen-TTS 语音',
        'qwen_plus': 'Qwen-Plus 对话',
        'qwen_235b': 'Qwen-235B 时间轴'
    };

    return (
        <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">💰 API 成本监控</h2>
                <button
                    onClick={fetchStats}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm"
                >
                    🔄 刷新
                </button>
            </div>

            {/* Total Summary */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-900 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">总调用次数</div>
                    <div className="text-3xl font-bold text-blue-400">{stats.total_calls}</div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">总成本</div>
                    <div className="text-3xl font-bold text-green-400">
                        ¥{stats.total_cost.toFixed(2)}
                    </div>
                </div>
            </div>

            {/* By API Breakdown */}
            <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-300 mb-3">API 明细</h3>
                {Object.entries(stats.by_api).map(([apiKey, apiStats]) => {
                    const percentage = stats.total_cost > 0
                        ? (apiStats.cost / stats.total_cost) * 100
                        : 0;

                    return (
                        <div key={apiKey} className="bg-gray-900 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">{apiNames[apiKey] || apiKey}</span>
                                <span className="text-sm text-gray-400">
                                    {apiStats.calls} 次调用
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Progress Bar */}
                                <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
                                        style={{ width: `${percentage}%` }}
                                    ></div>
                                </div>

                                {/* Cost */}
                                <span className="text-green-400 font-mono text-sm min-w-[80px] text-right">
                                    ¥{apiStats.cost.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    );
                })}

                {Object.keys(stats.by_api).length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                        暂无API调用记录
                    </div>
                )}
            </div>

            {/* Warning if cost is high */}
            {stats.total_cost > 100 && (
                <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
                    <div className="flex items-center gap-2">
                        <span className="text-yellow-400 text-xl">⚠️</span>
                        <div>
                            <div className="font-medium text-yellow-400">成本警告</div>
                            <div className="text-sm text-gray-400">
                                当前成本已超过 ¥100，请注意控制API调用频率
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CostDashboard;
