import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVideo, regenerateTimeline } from '../services/api';
import type { Video } from '../types';
import { formatDuration } from '../utils/format';
import { generateSRT, downloadSRT } from '../utils/srt';

export function PlayerPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [video, setVideo] = useState<Video | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'timeline' | 'conversation'>('transcript');
    const [isRegenerating, setIsRegenerating] = useState(false);

    useEffect(() => {
        if (!id) {
            navigate('/history');
            return;
        }

        loadVideo();

        // Auto-refresh if video is processing
        const intervalId = setInterval(() => {
            if (video?.status === 'processing') {
                loadVideo();
            }
        }, 2000);

        return () => clearInterval(intervalId);
    }, [id, video?.status]);

    const loadVideo = async () => {
        if (!id) return;

        setIsLoading(true);
        try {
            const data = await getVideo(id);
            setVideo(data);
        } catch (error) {
            console.error('[Player Error] Failed to load video:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportSRT = () => {
        if (!video || !video.processing?.transcription) return;

        const srt = generateSRT(video.processing.transcription);
        downloadSRT(video.filename, srt);
    };

    const handleRegenerateTimeline = async () => {
        if (!video || !id) return;

        setIsRegenerating(true);
        try {
            const result = await regenerateTimeline(id);
            setVideo({
                ...video,
                processing: {
                    ...video.processing!,
                    timeline: result.timeline
                }
            });
            console.log(`✅ Timeline regenerated: ${result.count} events`);
        } catch (error) {
            console.error('Failed to regenerate timeline:', error);
        } finally {
            setIsRegenerating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                    <div className="mt-4 text-gray-600">Loading video...</div>
                </div>
            </div>
        );
    }

    if (!video) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">📹</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Video Not Found</h2>
                    <p className="text-gray-600 mb-6">The requested video could not be found.</p>
                    <button
                        onClick={() => navigate('/history')}
                        className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
                    >
                        Back to History
                    </button>
                </div>
            </div>
        );
    }

    const hasTranscript = video.processing?.transcription && video.processing.transcription.length > 0;
    const hasSummary = video.processing?.summary && (
        typeof video.processing.summary === 'string' ||
        (typeof video.processing.summary === 'object' && video.processing.summary.tldr)
    );
    const hasTimeline = video.processing?.timeline && video.processing.timeline.length > 0;
    const hasConversation = video.conversation && video.conversation.length > 0;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/history')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-indigo-500 transition-all shadow-sm group"
                    >
                        <svg className="w-5 h-5 text-gray-600 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="font-semibold text-gray-700 group-hover:text-indigo-600">返回</span>
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">{video.originalName}</h1>
                    <div className="w-32"></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Video Player */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                            <video
                                controls
                                className="w-full"
                                src={`/uploads/${video.filename}`}
                            >
                                Your browser does not support video playback.
                            </video>
                        </div>

                        {/* Tabs */}
                        <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
                            <div className="border-b border-gray-200">
                                <nav className="-mb-px flex space-x-8">
                                    <button
                                        onClick={() => setActiveTab('transcript')}
                                        className={`px-6 py-3 font-medium ${activeTab === 'transcript'
                                            ? 'border-b-2 border-blue-600 text-blue-600'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        转录
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('summary')}
                                        className={`px-6 py-3 font-medium ${activeTab === 'summary'
                                            ? 'border-b-2 border-blue-600 text-blue-600'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        摘要
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('timeline')}
                                        className={`px-6 py-3 font-medium ${activeTab === 'timeline'
                                            ? 'border-b-2 border-blue-600 text-blue-600'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        时间轴
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('conversation')}
                                        className={`px-6 py-3 font-medium ${activeTab === 'conversation'
                                            ? 'border-b-2 border-blue-600 text-blue-600'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        AI对话记录
                                    </button>
                                </nav>
                            </div>

                            <div className="mt-6">
                                {activeTab === 'transcript' && (
                                    <div>
                                        {hasTranscript ? (
                                            <div className="space-y-4">
                                                {video.processing!.transcription!.map((segment, index) => (
                                                    <div
                                                        key={index}
                                                        onClick={() => {
                                                            const videoElement = document.querySelector('video');
                                                            if (videoElement) {
                                                                videoElement.currentTime = segment.start;
                                                                videoElement.play();
                                                            }
                                                        }}
                                                        className="flex gap-4 p-3 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors group"
                                                    >
                                                        <div className="text-sm font-medium text-blue-600 w-24 flex-shrink-0 group-hover:text-blue-700">
                                                            {formatDuration(segment.start)}
                                                        </div>
                                                        <div className="flex-1 text-gray-900 leading-relaxed">
                                                            {segment.text}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-gray-500">
                                                暂无转录数据
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'summary' && (
                                    <div>
                                        {hasSummary ? (
                                            <div className="space-y-4">
                                                {typeof video.processing!.summary === 'string' ? (
                                                    <p className="text-gray-700 leading-relaxed">{video.processing!.summary}</p>
                                                ) : (
                                                    <>
                                                        {video.processing!.summary!.tldr && (
                                                            <div>
                                                                <h3 className="font-semibold text-gray-900 mb-2">核心摘要</h3>
                                                                <p className="text-gray-700 leading-relaxed">{video.processing!.summary!.tldr}</p>
                                                            </div>
                                                        )}

                                                        {video.processing!.summary!.keyPoints && video.processing!.summary!.keyPoints.length > 0 && (
                                                            <div>
                                                                <h3 className="font-semibold text-gray-900 mb-2">关键要点</h3>
                                                                <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                                    {video.processing!.summary!.keyPoints.map((point, index) => (
                                                                        <li key={index}>{point}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}

                                                        {video.processing!.summary!.actionItems && video.processing!.summary!.actionItems.length > 0 && (
                                                            <div>
                                                                <h3 className="font-semibold text-gray-900 mb-2">待办事项</h3>
                                                                <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                                    {video.processing!.summary!.actionItems.map((item, index) => (
                                                                        <li key={index}>{item}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-gray-500">
                                                暂无摘要数据
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'timeline' && (
                                    <div>
                                        {/* Regenerate Timeline Button - show if transcription exists */}
                                        {video.processing?.transcription && (
                                            <div className="mb-4 flex justify-end">
                                                <button
                                                    onClick={handleRegenerateTimeline}
                                                    disabled={isRegenerating}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                                                >
                                                    {isRegenerating ? (
                                                        <>
                                                            <span className="animate-spin">🔄</span>
                                                            重新生成中...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span>🔄</span>
                                                            重新生成时间轴
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}

                                        {hasTimeline ? (
                                            <div className="space-y-2">
                                                {video.processing!.timeline!.map((event, index) => (
                                                    <div
                                                        key={index}
                                                        onClick={() => {
                                                            const videoElement = document.querySelector('video');
                                                            if (videoElement) {
                                                                videoElement.currentTime = event.timestamp;
                                                                videoElement.play();
                                                            }
                                                        }}
                                                        className="flex gap-4 p-3 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors group"
                                                    >
                                                        <div className="text-sm font-medium text-blue-600 w-24 flex-shrink-0 group-hover:text-blue-700">
                                                            {formatDuration(event.timestamp)}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="text-gray-900 leading-relaxed">{event.event}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-gray-500">
                                                暂无时间轴数据
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'conversation' && (
                                    <div>
                                        {hasConversation ? (
                                            <div className="space-y-4">
                                                {video.conversation!.map((msg: { role: string; content: string; timestamp: number }, index: number) => (
                                                    <div
                                                        key={index}
                                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                                    >
                                                        <div className={`max-w-[70%] rounded-lg p-4 ${msg.role === 'user'
                                                                ? 'bg-blue-500 text-white'
                                                                : 'bg-gray-100 text-gray-900'
                                                            }`}>
                                                            <div className="text-xs opacity-75 mb-1">
                                                                {msg.role === 'user' ? '你' : 'AI'}
                                                                {msg.timestamp && ` • ${new Date(msg.timestamp * 1000).toLocaleTimeString()}`}
                                                            </div>
                                                            <div className="whitespace-pre-wrap leading-relaxed">
                                                                {msg.content}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-gray-500">
                                                暂无AI对话记录
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                                <p className="mt-1 text-lg font-semibold text-gray-900 capitalize">{video.status}</p>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Uploaded</h3>
                                <p className="mt-1 text-gray-900">
                                    {new Date(video.uploadedAt).toLocaleString()}
                                </p>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Size</h3>
                                <p className="mt-1 text-gray-900">
                                    {(video.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>

                            {hasTranscript && (
                                <button
                                    onClick={handleExportSRT}
                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    导出字幕 (SRT)
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
