import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScreenRecorder } from '../services/recorder';
import { RecordButton } from '../components/RecordButton';
import { formatDuration, formatFileSize } from '../utils/format';
import { useStore } from '../store';

export function RecordPage() {
    const navigate = useNavigate();
    const { setRecordedBlob, setRecordingDuration } = useStore();

    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);

    const recorderRef = useRef<ScreenRecorder | undefined>(undefined);
    const timerRef = useRef<number | undefined>(undefined);
    const startTimeRef = useRef<number>(0);

    const handleStart = async () => {
        try {
            const recorder = new ScreenRecorder();
            await recorder.startRecording({ includeCamera: false });

            // IMPORTANT: Listen for the 'inactive' event which fires when user clicks "Stop Sharing" browser UI
            recorder.mediaRecorder?.addEventListener('inactive', handleStop);

            recorderRef.current = recorder;
            setIsRecording(true);
            startTimeRef.current = Date.now();

            // Start timer
            timerRef.current = window.setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
                setDuration(elapsed);
            }, 1000);

        } catch (error) {
            const err = error as Error;
            console.error('[Recording Error]', err.name, err.message);
            // Silent fail - user already sees the permission denial dialog
        }
    };

    const handleStop = async () => {
        // Prevent double calling
        if (!recorderRef.current || recorderRef.current.state === 'inactive') return;

        try {
            const blob = await recorderRef.current.stopRecording();
            setIsRecording(false);
            clearInterval(timerRef.current);

            // Save to store
            setRecordedBlob(blob);
            setRecordingDuration(duration);

            // Navigate to complete page
            navigate('/complete');

        } catch (error) {
            console.error(error);
        }
    };

    const handleBack = () => {
        if (isRecording) {
            if (confirm('Recording in progress. Stop and discard?')) {
                recorderRef.current?.stopRecording();
                navigate('/');
            }
        } else {
            navigate('/');
        }
    };

    useEffect(() => {
        return () => {
            clearInterval(timerRef.current);
            // Safety cleanup
            if (recorderRef.current && recorderRef.current.state === 'recording') {
                recorderRef.current.stopRecording().catch(console.error);
            }
        };
    }, []);

    return (
        <div className="min-h-screen relative flex flex-col justify-center overflow-hidden">
            {/* Vibrant Background */}
            <div className="absolute inset-0 bg-slate-50">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-200/40 rounded-full mix-blend-multiply filter blur-[100px] animate-blob"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-200/40 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000"></div>
                <div className="absolute inset-0 bg-grid-pattern opacity-40"></div>
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-6 w-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={handleBack}
                        className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 hover:bg-white text-slate-600 hover:text-slate-900 transition-all font-medium"
                    >
                        <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back
                    </button>

                    <div className="flex flex-col items-center">
                        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700">
                            {isRecording ? 'On Air' : 'Studio'}
                        </h1>
                        {isRecording && <span className="text-xs font-semibold text-rose-500 tracking-widest uppercase animate-pulse">Recording Protocol Active</span>}
                    </div>

                    <div className="w-24"></div> {/* Spacer for alignment */}
                </div>

                {/* Main Stage */}
                <div className="relative">
                    {/* Glowing Backdrop */}
                    <div className={`absolute -inset-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[2rem] opacity-20 blur-xl transition-opacity duration-1000 ${isRecording ? 'opacity-40 animate-pulse' : ''}`}></div>

                    <div className="relative bg-white/40 backdrop-blur-xl rounded-[2rem] border border-white/50 shadow-2xl overflow-hidden aspect-video flex flex-col items-center justify-center group">

                        {/* Status HUD */}
                        {isRecording && (
                            <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-6 px-6 py-3 bg-slate-900/90 backdrop-blur text-white rounded-full shadow-lg border border-white/10 z-20 animate-fade-in-down">
                                <div className="flex flex-col items-center min-w-[80px]">
                                    <span className="text-xs text-slate-400 font-medium tracking-wider uppercase">Duration</span>
                                    <span className="font-mono text-xl font-bold tracking-widest text-emerald-400">{formatDuration(duration)}</span>
                                </div>
                                <div className="w-px h-8 bg-white/20"></div>
                                <div className="flex flex-col items-center min-w-[80px]">
                                    <span className="text-xs text-slate-400 font-medium tracking-wider uppercase">Size</span>
                                    <span className="font-mono text-xl font-bold tracking-widest text-sky-400">{formatFileSize(duration * 300000 / 8)}</span>
                                </div>
                            </div>
                        )}

                        {/* Center Visual */}
                        <div className="text-center z-10 transition-transform duration-500">
                            {isRecording ? (
                                <div className="relative">
                                    <div className="absolute inset-0 bg-rose-500 blur-2xl opacity-20 animate-pulse"></div>
                                    <div className="w-32 h-32 rounded-full border-4 border-rose-500/30 flex items-center justify-center relative">
                                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-rose-500 to-red-600 animate-pulse flex items-center justify-center shadow-lg shadow-rose-500/50">
                                            <div className="w-8 h-8 rounded-sm bg-white"></div>
                                        </div>
                                        {/* Ripple Rings */}
                                        <div className="absolute inset-0 rounded-full border border-rose-500/50 animate-[ping_2s_infinite]"></div>
                                    </div>
                                    <p className="mt-8 text-slate-600 font-medium">Recording in progress...</p>
                                </div>
                            ) : (
                                <div className="group-hover:scale-105 transition-transform duration-300">
                                    <div className="w-32 h-32 mx-auto bg-gradient-to-br from-indigo-100 to-white rounded-3xl flex items-center justify-center shadow-inner mb-6">
                                        <svg className="w-16 h-16 text-indigo-500 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                    </div>
                                    <p className="text-2xl font-bold text-slate-800 mb-2">Ready to Capture</p>
                                    <p className="text-slate-500">Click the button below to start</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Audio Capture Hint - Only show before recording */}
                {!isRecording && (
                    <div className="mt-8 mb-6 max-w-2xl mx-auto">
                        <div className="bg-indigo-50/80 backdrop-blur-sm border border-indigo-200/60 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-slate-900 mb-2">
                                        🎙️ Audio Capture
                                    </h3>
                                    <ul className="text-sm text-slate-700 leading-relaxed space-y-1.5">
                                        <li className="flex items-start gap-2">
                                            <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                                            <span><span className="font-semibold">Browser Tab:</span> System audio + Microphone</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-sky-600 font-bold mt-0.5">○</span>
                                            <span><span className="font-semibold">Window/Screen:</span> Microphone only</span>
                                        </li>
                                    </ul>
                                    <p className="text-xs text-slate-500 mt-2">
                                        You'll be asked for microphone permission to ensure audio is captured in all modes.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Control Bar */}
                <div className="mt-12 text-center relative z-20">
                    <RecordButton
                        isRecording={isRecording}
                        onClick={isRecording ? handleStop : handleStart}
                    />

                    {!isRecording && (
                        <p className="mt-6 text-sm text-slate-400">
                            Supported: Entire Screen, Window, or Browser Tab
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
