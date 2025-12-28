// Format duration from seconds to mm:ss
export function formatDuration(seconds: number | string): string {
    if (typeof seconds === 'string') {
        const num = parseFloat(seconds);
        if (isNaN(num)) return seconds;
        seconds = num;
    }

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Format file size from bytes to KB/MB/GB
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// Format date
export function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    // Just now
    if (diffMins < 1) return '刚刚';

    // Minutes ago
    if (diffMins < 60) return `${diffMins}分钟前`;

    // Hours ago
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}小时前`;

    // Same year
    if (date.getFullYear() === now.getFullYear()) {
        return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    }

    // Different year
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}
