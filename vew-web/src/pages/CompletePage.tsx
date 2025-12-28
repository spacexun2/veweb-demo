import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { uploadVideo } from '../services/upload';
import { batchProcessVideos } from '../services/api';
import { ProgressBar } from '../components/ProgressBar';
import { formatDuration, formatFileSize } from '../utils/format';

export function CompletePage() {
    const navigate = useNavigate();
    const { recordedBlob, recordingDuration, setUploading, setUploadProgress } = useStore();

    const [autoProcess, setAutoProcess] = useState(true);
    const [isUploading, setIsUploadingLocal] = useState(false);
    const [uploadProgress, setUploadProgressLocal] = useState(0);
    const [previewUrl, setPreviewUrl] = useState<string>('');

    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (!recordedBlob) {
            navigate('/record');
            return;
        }

        // Create preview URL
        const url = URL.createObjectURL(recordedBlob);
        setPreviewUrl(url);

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [recordedBlob, navigate]);

    const handleUpload = async () => {
        if (!recordedBlob) return;

        setIsUploadingLocal(true);
        setUploading(true);

        try {
            const response = await uploadVideo(recordedBlob, (progress) => {
                setUploadProgressLocal(progress);
                setUploadProgress(progress);
            });

            // If auto process is enabled, trigger processing
            if (autoProcess) {
                await batchProcessVideos([response.videoId]);
            }

            // Navigate to history
            navigate('/history');

        } catch (error) {
            const err = error as Error;
            console.error('[Upload Error]', err.message);

            // Silent fail - user can see upload progress stuck
            // Error will be visible in console for debugging
            setIsUploadingLocal(false);
            setUploading(false);
        }
    };

    const handleRetake = () => {
        navigate('/record');
    };

    if (!recordedBlob) {
        return null;
    }

    return (
        <div className="min-h-screen relative flex items-center justify-center py-12 overflow-hidden">
            {/* Vibrant Background */}
            <div className="absolute inset-0 bg-slate-50">
                <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-emerald-200/40 rounded-full mix-blend-multiply filter blur-[100px] animate-blob"></div>
                <div className="absolute top-[-10%] right-[-10%] w-[45%] h-[45%] bg-sky-200/40 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-violet-200/40 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-4000"></div>
                <div className="absolute inset-0 bg-grid-pattern opacity-40"></div>
            </div>

            <div className="relative z-10 max-w-5xl w-full mx-auto px-6">
                {/* Header Navigation */}
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => navigate('/')}
                        className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 hover:bg-white text-slate-600 hover:text-slate-900 transition-all font-medium"
                    >
                        <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Home
                    </button>

                    <button
                        onClick={() => navigate('/history')}
                        className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 hover:bg-white text-slate-600 hover:text-slate-900 transition-all font-medium"
                    >
                        View History
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>

                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/30 mb-6 animate-bounce-in">
                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 mb-3">
                        Recording Complete
                    </h1>
                    <p className="text-xl text-slate-600 font-medium">Preview and choose your next action</p>
                </div>

                {/* Preview */}
                <div className="relative mb-8">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl opacity-20 blur-xl"></div>
                    <div className="relative bg-white/60 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl border border-white/60">
                        <video
                            ref={videoRef}
                            src={previewUrl}
                            controls
                            className="w-full bg-black"
                        />
                    </div>
                </div>

                {/* Info Cards */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-white/60 shadow-lg hover:shadow-xl transition-shadow">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-200">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-sm text-slate-500 font-medium mb-1">Duration</div>
                                <div className="text-3xl font-black text-slate-900">
                                    {formatDuration(recordingDuration)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-white/60 shadow-lg hover:shadow-xl transition-shadow">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-200">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-sm text-slate-500 font-medium mb-1">File Size</div>
                                <div className="text-3xl font-black text-slate-900">
                                    {formatFileSize(recordedBlob.size)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Options */}
                {!isUploading && (
                    <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/60 shadow-lg">
                        <label className="flex items-center gap-4 cursor-pointer group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={autoProcess}
                                    onChange={(e) => setAutoProcess(e.target.checked)}
                                    className="w-6 h-6 text-indigo-600 border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/50 cursor-pointer transition-all"
                                />
                            </div>
                            <div className="flex-1">
                                <span className="text-slate-900 font-bold group-hover:text-indigo-600 transition-colors">Auto-trigger AI processing after upload</span>
                                <p className="text-sm text-slate-500 mt-1">Automatically perform speech transcription and content analysis</p>
                            </div>
                        </label>
                    </div>
                )}

                {/* Upload progress */}
                {isUploading && (
                    <div className="bg-white/70 backdrop-blur-md rounded-2xl p-8 mb-8 border border-white/60 shadow-lg">
                        <div className="flex items-center gap-6 mb-6">
                            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xl font-bold text-slate-900">Uploading...</span>
                                    <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                                        {uploadProgress.toFixed(0)}%
                                    </span>
                                </div>
                                <ProgressBar progress={uploadProgress} />
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 text-center font-medium">
                            {autoProcess ? 'AI processing will begin automatically after upload' : 'Uploading video file'}
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center justify-center gap-5">
                        <button
                            onClick={handleRetake}
                            disabled={isUploading}
                            className="group px-8 py-4 bg-white/60 backdrop-blur border border-white/60 text-slate-700 rounded-xl hover:bg-white hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg"
                        >
                            <span className="flex items-center gap-2">
                                <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                Re-Record
                            </span>
                        </button>

                        <button
                            onClick={handleUpload}
                            disabled={isUploading}
                            className="group relative px-10 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                            <span className="relative flex items-center gap-3 text-white">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                {autoProcess ? 'Upload & Process' : 'Upload Only'}
                            </span>
                        </button>
                    </div>

                    {!isUploading && (
                        <button
                            onClick={() => navigate('/')}
                            className="text-slate-500 hover:text-slate-700 font-medium text-sm underline underline-offset-4 transition-colors"
                        >
                            Skip upload, return to home
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
