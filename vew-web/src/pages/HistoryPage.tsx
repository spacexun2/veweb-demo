import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { getVideos, batchProcessVideos, batchDeleteVideos, batchExportSRT, renameVideo } from '../services/api';
import { VideoCard } from '../components/VideoCard';
import { BatchActionBar } from '../components/BatchActionBar';
import { Toast } from '../components/Toast';
import { generateSRT, downloadSRT } from '../utils/srt';

type ToastType = 'success' | 'error' | 'info' | 'warning';

export function HistoryPage() {
    const navigate = useNavigate();
    const {
        videos,
        setVideos,
        updateVideo,
        removeVideo,
        selectedVideoIds,
        toggleVideoSelection,
        clearSelection,
        selectAll,
    } = useStore();

    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
    const [renamingVideoId, setRenamingVideoId] = useState<string | null>(null);
    const [newVideoName, setNewVideoName] = useState('');
    const [showRecordingModal, setShowRecordingModal] = useState(false);

    useEffect(() => { loadVideos(); }, []);

    const showToast = (message: string, type: ToastType = 'info') => {
        setToast({ message, type });
    };

    const loadVideos = async () => {
        setIsLoading(true);
        try {
            const data = await getVideos();
            setVideos(data);
        } catch (error) {
            showToast('Failed to load videos. Please check if backend is running.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Handlers
    const handleView = (videoId: string) => navigate(`/player/${videoId}`);

    const handleProcess = async (videoId: string) => {
        try {
            // Immediately update UI to processing state
            updateVideo(videoId, { status: 'processing' });

            await batchProcessVideos([videoId]);
            showToast('Processing started successfully', 'success');

            // Reload to get latest status
            loadVideos();
        } catch (error) {
            showToast('Operation failed. Please try again.', 'error');
            // Revert on error
            updateVideo(videoId, { status: 'failed' });
        }
    };

    const handleExportSRT = (videoId: string) => {
        const video = videos.find(v => v.id === videoId);
        if (!video?.processing?.transcription) {
            showToast('No transcription available for this video', 'warning');
            return;
        }
        downloadSRT(video.filename, generateSRT(video.processing.transcription));
        showToast('SRT file downloaded', 'success');
    };

    const handleDelete = async (videoId: string) => {
        // First click: show confirmation state
        if (deletingVideoId !== videoId) {
            setDeletingVideoId(videoId);
            // Auto-cancel after 3 seconds
            setTimeout(() => {
                if (deletingVideoId === videoId) {
                    setDeletingVideoId(null);
                }
            }, 3000);
            return;
        }

        // Second click: confirm delete
        try {
            await batchDeleteVideos([videoId]);
            removeVideo(videoId);
            setDeletingVideoId(null);
            showToast('Video deleted successfully', 'success');
        } catch (error) {
            showToast('Delete failed. Please try again.', 'error');
            setDeletingVideoId(null);
        }
    };

    const handleRename = async (videoId: string) => {
        if (!newVideoName.trim()) {
            return;
        }

        try {
            await renameVideo(videoId, newVideoName);
            await loadVideos(); // Refresh list
            setRenamingVideoId(null);
            setNewVideoName('');
        } catch (error) {
            console.error('重命名失败:', error);
            alert('重命名失败');
        }
    };

    const startRename = (video: any) => {
        setRenamingVideoId(video.id);
        setNewVideoName(video.originalName);
    };

    const cancelRename = () => {
        setRenamingVideoId(null);
        setNewVideoName('');
    };


    // Batch Handlers
    const handleBatchProcess = async () => {
        const ids = Array.from(selectedVideoIds);
        if (!ids.length) return;
        setIsProcessing(true);
        try {
            await batchProcessVideos(ids);
            clearSelection();
            showToast(`Processing started for ${ids.length} video(s)`, 'success');
            loadVideos();
        } catch (e) {
            showToast('Batch process failed. Please try again.', 'error');
        }
        finally { setIsProcessing(false); }
    };

    const handleBatchDelete = async () => {
        const ids = Array.from(selectedVideoIds);
        if (!ids.length || !confirm(`Delete ${ids.length} videos?`)) return;
        try {
            await batchDeleteVideos(ids);
            ids.forEach(id => removeVideo(id));
            clearSelection();
            showToast(`${ids.length} video(s) deleted successfully`, 'success');
        } catch (e) {
            showToast('Batch delete failed. Please try again.', 'error');
        }
    };

    const handleBatchExportSRT = async () => {
        const ids = Array.from(selectedVideoIds);
        if (!ids.length) return;
        try {
            const blob = await batchExportSRT(ids);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `vew_export_${Date.now()}.zip`;
            a.click();
            showToast(`Exported SRT files for ${ids.length} video(s)`, 'success');
        } catch (e) {
            showToast('Batch export failed. Please try again.', 'error');
        }
    };

    const filteredVideos = videos.filter(v =>
        (v.originalName || v.filename).toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen relative flex flex-col">
            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Colorful Background Blobs */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
                <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-pink-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[10%] left-[20%] w-[35%] h-[35%] bg-sky-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
                <div className="absolute inset-0 bg-grid-pattern opacity-60"></div>
            </div>

            {/* Header */}
            <header className="relative z-20 bg-white/70 backdrop-blur-xl border-b border-white/50 sticky top-0 supports-[backdrop-filter]:bg-white/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between py-4">
                    <div className="flex items-center gap-8">
                        {/* Home Button */}
                        <button
                            onClick={() => navigate('/')}
                            className="text-gray-600 hover:text-gray-900 transition-colors"
                            title="返回首页"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                        </button>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                            <div className="relative">
                                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                                <div className="relative w-10 h-10 rounded-lg bg-white flex items-center justify-center text-xl">
                                    <span className="bg-clip-text text-transparent bg-gradient-to-br from-indigo-600 to-fuchsia-600 font-black">V</span>
                                </div>
                            </div>
                            History
                        </h1>

                        <div className="relative group hidden md:block">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <input
                                type="text"
                                className="block w-72 pl-10 pr-4 py-2.5 border border-slate-200/60 rounded-xl bg-white/50 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 transition-all font-medium"
                                placeholder="Search your library..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowRecordingModal(true)} className="group relative inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-indigo-500/25 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-fuchsia-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <span className="relative flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                New Recording
                            </span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Batch Actions */}
            <BatchActionBar
                selectedCount={selectedVideoIds.size}
                totalCount={filteredVideos.length}
                onSelectAll={selectAll}
                onClearSelection={clearSelection}
                onBatchProcess={handleBatchProcess}
                onBatchDelete={handleBatchDelete}
                onBatchExportSRT={handleBatchExportSRT}
                isProcessing={isProcessing}
            />

            {/* Content */}
            <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {isLoading ? (
                    <div className="flex justify-center py-32">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"></div>
                        </div>
                    </div>
                ) : filteredVideos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-in-up">
                        <div className="w-32 h-32 relative mb-8">
                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-200 to-fuchsia-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
                            <div className="relative w-full h-full bg-white rounded-full flex items-center justify-center shadow-sm border border-white">
                                <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            </div>
                        </div>

                        <h3 className="text-2xl font-bold text-slate-900 mb-2">It's quiet here...</h3>
                        <p className="text-slate-500 max-w-md text-lg">
                            Ready to create something amazing? <br />
                            Record your first video to unlock AI insights.
                        </p>
                        <button onClick={() => navigate('/')} className="mt-8 px-8 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:border-indigo-300 hover:text-indigo-600 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                            Start first recording
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredVideos.map(video => (
                            <VideoCard
                                key={video.id}
                                video={video}
                                isSelected={selectedVideoIds.has(video.id)}
                                isDeleting={deletingVideoId === video.id}
                                onToggleSelect={() => toggleVideoSelection(video.id)}
                                onView={() => handleView(video.id)}
                                onProcess={() => handleProcess(video.id)}
                                onDelete={() => handleDelete(video.id)}
                                onExportSRT={() => handleExportSRT(video.id)}
                                onRename={() => startRename(video)}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* Rename Modal */}
            {renamingVideoId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={cancelRename}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">重命名视频</h3>
                        <input
                            type="text"
                            value={newVideoName}
                            onChange={(e) => setNewVideoName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRename(renamingVideoId);
                                if (e.key === 'Escape') cancelRename();
                            }}
                            className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-colors mb-4"
                            placeholder="输入新名称"
                            autoFocus
                        />
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={cancelRename}
                                className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={() => handleRename(renamingVideoId)}
                                className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                            >
                                保存
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Recording Mode Selection Modal */}
            {showRecordingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowRecordingModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-6 py-4 text-white">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold">选择录制模式</h2>
                                <button
                                    onClick={() => setShowRecordingModal(false)}
                                    className="text-white/80 hover:text-white transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Standard Recording */}
                            <button
                                onClick={() => {
                                    setShowRecordingModal(false);
                                    navigate('/record');
                                }}
                                className="group relative bg-gradient-to-br from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 border-2 border-slate-200 hover:border-indigo-400 rounded-xl p-6 transition-all hover:shadow-lg hover:-translate-y-1"
                            >
                                <div className="flex flex-col items-center text-center space-y-3">
                                    <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900">开始录制</h3>
                                    <p className="text-sm text-slate-600">传统屏幕录制，简单高效</p>
                                    <ul className="text-xs text-slate-500 space-y-1 text-left w-full">
                                        <li>• 屏幕 + 麦克风录制</li>
                                        <li>• 自动生成字幕</li>
                                        <li>• AI 智能总结</li>
                                    </ul>
                                </div>
                            </button>

                            {/* AI Interactive Recording */}
                            <button
                                onClick={() => {
                                    setShowRecordingModal(false);
                                    navigate('/interactive-record');
                                }}
                                className="group relative bg-gradient-to-br from-indigo-50 to-fuchsia-50 hover:from-indigo-100 hover:to-fuchsia-100 border-2 border-indigo-300 hover:border-fuchsia-400 rounded-xl p-6 transition-all hover:shadow-xl hover:-translate-y-1"
                            >
                                <div className="absolute top-3 right-3 bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                                    NEW
                                </div>
                                <div className="flex flex-col items-center text-center space-y-3">
                                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-fuchsia-600 rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-fuchsia-600">AI互动录制</h3>
                                    <p className="text-sm text-slate-600">AI实时理解，主动交互</p>
                                    <ul className="text-xs text-slate-500 space-y-1 text-left w-full">
                                        <li>• 实时画面分析</li>
                                        <li>• AI 主动提问</li>
                                        <li>• 智能对话助手</li>
                                    </ul>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
