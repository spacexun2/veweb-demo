import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
                        <strong>💡 Demo说明：</strong>使用测试账号登录体验多用户协作功能
                    </p>
                    <p className="text-xs text-blue-600 mt-2">
                        账号格式: 1-10@veweb.com (数字前缀) | 密码: demo123
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
