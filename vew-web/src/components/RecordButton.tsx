interface RecordButtonProps {
    isRecording: boolean;
    isPaused?: boolean;
    onClick: () => void;
    disabled?: boolean;
}

export function RecordButton({
    isRecording,
    isPaused = false,
    onClick,
    disabled = false
}: RecordButtonProps) {
    let baseClass = "group relative px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ";
    let content = null;

    if (isRecording && !isPaused) {
        // Stop Button
        content = (
            <>
                <div className="absolute inset-0 bg-gradient-to-r from-rose-500 to-red-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute inset-0 rounded-xl ring-4 ring-rose-500/30 animate-pulse"></div>
                <span className="relative flex items-center gap-3 text-white">
                    <span className="w-4 h-4 rounded-sm bg-white animate-pulse"></span>
                    Stop Recording
                </span>
            </>
        );
    } else if (isPaused) {
        // Resume Button
        content = (
            <>
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative flex items-center gap-3 text-white">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    Resume
                </span>
            </>
        );
    } else {
        // Start Button
        content = (
            <>
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 bg-repeat bg-[length:100px]"></div>
                <span className="relative flex items-center gap-3 text-white">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white/20"></span>
                    </span>
                    Start Recording
                </span>
            </>
        );
    }

    return (
        <button onClick={onClick} disabled={disabled} className={baseClass}>
            {content}
        </button>
    );
}
