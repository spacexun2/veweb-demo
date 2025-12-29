import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export function HomePage() {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const token = localStorage.getItem('demo_token');
        const userStr = localStorage.getItem('demo_user');
        if (token && userStr) {
            setUser(JSON.parse(userStr));
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('demo_token');
        localStorage.removeItem('demo_user');
        setUser(null);
    };

    return (
        <div className="min-h-screen relative overflow-hidden flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            {/* Login/Logout Button */}
            <div className="absolute top-6 right-6 z-20">
                {user ? (
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-700">
                            {user.avatar} {user.name}
                        </span>
                        <button
                            onClick={handleLogout}
                            className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-white transition-all"
                        >
                            退出登录
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => navigate('/login')}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:shadow-lg transition-all"
                    >
                        🔐 登录
                    </button>
                )}
            </div>
            {/* Dynamic Background Blobs */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

            <div className="absolute inset-0 bg-grid-pattern z-0 pointer-events-none"></div>

            {/* Main Content */}
            <div className="relative z-10 text-center max-w-5xl mx-auto px-4">

                {/* Colorful Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-white/50 shadow-sm mb-8 hover:scale-105 transition-transform cursor-default">
                    <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                    </span>
                    <span className="text-sm font-semibold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-fuchsia-500">
                        Intelligent Recording
                    </span>
                </div>

                <h1 className="text-6xl md:text-8xl font-black tracking-tight text-slate-900 mb-6 drop-shadow-sm">
                    Capture Actions, <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-500 animate-text-shimmer bg-[size:200%_auto]">
                        Understand Intent
                    </span>
                </h1>

                <p className="mt-6 max-w-2xl mx-auto text-xl text-slate-600 font-medium leading-relaxed">
                    Go beyond simple screen recording. Vew identifies the
                    <span className="text-indigo-600"> Purpose</span> behind your actions and reveals
                    <span className="text-fuchsia-600"> User Intent</span> with advanced AI.
                </p>

                {/* Action Buttons */}
                <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => navigate('/record')}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3"
                    >
                        <span className="text-2xl">⏺</span>
                        开始录制
                    </button>

                    <button
                        onClick={() => navigate('/interactive-record')}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3 relative"
                    >
                        <span className="text-2xl">🤖</span>
                        AI互动录制
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">NEW</span>
                    </button>

                    <button
                        onClick={() => navigate('/history')}
                        className="bg-gray-800 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-700 transition-all duration-300 flex items-center justify-center gap-3"
                    >
                        <span className="text-2xl">📂</span>
                        历史记录
                    </button>

                    <button
                        onClick={() => navigate('/test-ai')}
                        className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3"
                    >
                        <span className="text-2xl">🧪</span>
                        AI测试
                    </button>
                </div>

                {/* Colorful Cards */}
                <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                    {/* Card 1 */}
                    <div className="group p-8 bg-white/70 backdrop-blur-md rounded-3xl border border-white/60 shadow-lg hover:shadow-indigo-200 transition-all duration-300 hover:-translate-y-2">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white mb-6 shadow-md shadow-indigo-200 group-hover:scale-110 transition-transform">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">AI Transcription</h3>
                        <p className="text-slate-500 leading-relaxed">High-accuracy speech to text, supporting multiple languages and dialects.</p>
                    </div>

                    {/* Card 2 */}
                    <div className="group p-8 bg-white/70 backdrop-blur-md rounded-3xl border border-white/60 shadow-lg hover:shadow-fuchsia-200 transition-all duration-300 hover:-translate-y-2">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-pink-600 flex items-center justify-center text-white mb-6 shadow-md shadow-fuchsia-200 group-hover:scale-110 transition-transform">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">Smart Summary</h3>
                        <p className="text-slate-500 leading-relaxed">Instant key insights, action items, and topic detection powered by LLMs.</p>
                    </div>

                    {/* Card 3 */}
                    <div className="group p-8 bg-white/70 backdrop-blur-md rounded-3xl border border-white/60 shadow-lg hover:shadow-emerald-200 transition-all duration-300 hover:-translate-y-2">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white mb-6 shadow-md shadow-emerald-200 group-hover:scale-110 transition-transform">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">Data Privacy</h3>
                        <p className="text-slate-500 leading-relaxed">Your data is secure. We prioritize confidentiality and secure processing.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
