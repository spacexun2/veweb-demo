// Video types
export interface Video {
    id: string;
    filename: string;
    originalName?: string;
    // Backend fields
    uploadedAt: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    // Legacy fields for backwards compatibility
    uploadDate: string;
    aiStatus: 'pending' | 'processing' | 'completed' | 'failed';
    size: number;
    duration: string | number;
    url: string;
    transcriptReady: boolean;
    summaryReady: boolean;
    processing?: ProcessingResult;
    conversation?: Array<{
        role: string;
        content: string;
        timestamp: number;
    }>;
}

export interface ProcessingResult {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    transcription?: TranscriptionSegment[];
    summary?: Summary | string;  // Can be string (Python AI) or object (legacy)
    timeline?: TimelineEvent[];
    error?: string;
}

export interface TranscriptionSegment {
    start: number;
    end: number;
    text: string;
    language?: string;
}

export interface Summary {
    tldr: string;
    keyPoints: string[];
    actionItems: string[];
}

export interface TimelineEvent {
    timestamp: number;
    type?: 'speech' | 'action' | 'highlight';
    content?: string;
    event?: string;  // Python AI uses 'event' field
    importance?: 'low' | 'medium' | 'high';
    tags?: string[];
}

// Upload response
export interface UploadResponse {
    success: boolean;
    videoId: string;
    filename: string;
    size: number;
    url: string;
}

// API request/response types
export interface BatchProcessRequest {
    videoIds: string[];
}

export interface BatchProcessResponse {
    success: boolean;
    results: Array<{
        videoId: string;
        status: string;
    }>;
}

export interface BatchDeleteResponse {
    success: boolean;
    deleted: number;
    results: Array<{
        videoId: string;
        status: string;
    }>;
}

// Recording options
export interface RecordingOptions {
    includeCamera?: boolean;
    audioBitrate?: number;
    videoBitrate?: number;
}
