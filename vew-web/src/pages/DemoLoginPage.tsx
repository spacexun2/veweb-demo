import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DEMO_ACCOUNTS = [
    { email: 'pm@veweb.com', password: 'demo123', name: '产品经理', avatar: '👨‍💼' },
    { email: 'dev@veweb.com', password: 'demo123', name: '开发工程师', avatar: '👨‍💻' },
    { email: 'boss@veweb.com', password: 'demo123', name: '老板', avatar: '👔' }
];

export const DemoLoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/demo-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || '登录失败');
            }

            const { token, user } = await response.json();

            // Save to localStorage
            localStorage.setItem('demo_token', token);
            localStorage.setItem('demo_user', JSON.stringify(user));

            navigate('/');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const quickLogin = (account: typeof DEMO_ACCOUNTS[0]) => {
        setEmail(account.email);
        setPassword(account.password);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-4">
            <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-2xl w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Veweb Demo
                    </h1>
                    <p className="text-gray-600 mt-2">AI驱动的视频协作平台</p>
                    <p className="text-sm text-gray-500 mt-1">演示版本 - 3个测试账号</p>
                </div>

                {/* Quick Login Buttons */}
                <div className="mb-6">
                    <p className="text-sm font-medium text-gray-700 mb-3">快速登录（点击账号自动填充）</p>
                    <div className="space-y-2">
                        {DEMO_ACCOUNTS.map((account) => (
                            <button
                                key={account.email}
                                onClick={() => quickLogin(account)}
                                className="w-full p-3 text-left border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-500 transition-all flex items-center gap-3"
                            >
                                <span className="text-2xl">{account.avatar}</span>
                                <div>
                                    <div className="font-medium text-gray-900">{account.name}</div>
                                    <div className="text-sm text-gray-500">{account.email}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">或手动输入</span>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="邮箱地址"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="密码"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 transition-all"
                    >
                        {loading ? '登录中...' : '登录'}
                    </button>
                </form>

                {/* Demo Info */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                        <strong>💡 Demo说明：</strong>所有账号密码都是 <code className="bg-blue-100 px-2 py-1 rounded">demo123</code>
                    </p>
                    <p className="text-xs text-blue-600 mt-2">
                        每个账号的数据相互隔离，演示多用户功能
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-4 text-center w-full">
                <p className="text-white text-sm">
                    © 2025 Veweb Demo. Powered by Railway.app
                </p>
            </div>
        </div>
    );
};
