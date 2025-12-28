interface StatusBadgeProps {
    status: 'pending' | 'processing' | 'completed' | 'failed';
}

export function StatusBadge({ status }: StatusBadgeProps) {
    const config = {
        pending: {
            bg: 'bg-gray-100',
            text: 'text-gray-600',
            label: 'Pending',
            dot: 'bg-gray-400'
        },
        processing: {
            bg: 'bg-blue-50',
            text: 'text-blue-700',
            label: 'Processing',
            dot: 'bg-blue-500 animate-pulse'
        },
        completed: {
            bg: 'bg-green-50',
            text: 'text-green-700',
            label: 'Ready',
            dot: 'bg-green-500'
        },
        failed: {
            bg: 'bg-red-50',
            text: 'text-red-700',
            label: 'Failed',
            dot: 'bg-red-500'
        },
    };

    // Fallback to 'pending' if status is undefined or invalid
    const safeStatus = (status && config[status]) ? status : 'pending';
    const style = config[safeStatus];

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${style.dot}`}></span>
            {style.label}
        </span>
    );
}
