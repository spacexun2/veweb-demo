interface ProgressBarProps {
    progress: number; // 0-100
    className?: string;
}

export function ProgressBar({ progress, className = '' }: ProgressBarProps) {
    return (
        <div className={`w-full bg-gray-200 rounded-full h-3 overflow-hidden ${className}`}>
            <div
                className="progress-gradient h-3 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            >
                <div className="absolute inset-0 shimmer"></div>
            </div>
        </div>
    );
}
