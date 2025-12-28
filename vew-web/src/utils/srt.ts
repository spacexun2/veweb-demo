import type { TranscriptionSegment } from '../types';

// Convert transcription segments to SRT format
export function generateSRT(segments: TranscriptionSegment[]): string {
    let srt = '';

    segments.forEach((segment, index) => {
        srt += `${index + 1}\n`;
        srt += `${formatSRTTime(segment.start)} --> ${formatSRTTime(segment.end)}\n`;
        srt += `${segment.text}\n\n`;
    });

    return srt;
}

// Format time for SRT (00:00:00,000)
function formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

// Download SRT file
export function downloadSRT(filename: string, srtContent: string): void {
    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename.replace(/\.(webm|mp4)$/, '.srt');
    link.click();

    URL.revokeObjectURL(url);
}
