import axios from 'axios';
import type {
    Video,
    BatchProcessResponse,
    BatchDeleteResponse
} from '../types';

const api = axios.create({
    baseURL: '',
    timeout: 30000,
});

// Get all videos
export async function getVideos(): Promise<Video[]> {
    const response = await api.get<{ videos: Video[] }>('/api/videos');
    return response.data.videos;
}

// Get single video details
export async function getVideo(id: string): Promise<Video> {
    const response = await api.get<Video>(`/api/video/${id}`);
    return response.data;
}

// Delete single video
export async function deleteVideo(id: string): Promise<void> {
    await api.delete(`/api/video/${id}`);
}

// Batch process videos
export async function batchProcessVideos(videoIds: string[]): Promise<BatchProcessResponse> {
    const response = await api.post<BatchProcessResponse>('/api/videos/batch-process', {
        videoIds,
    });
    return response.data;
}

// Batch delete videos
export async function batchDeleteVideos(videoIds: string[]): Promise<BatchDeleteResponse> {
    const response = await api.post<BatchDeleteResponse>('/api/videos/batch-delete', {
        videoIds,
    });
    return response.data;
}

// Batch export SRT
export async function batchExportSRT(videoIds: string[]): Promise<Blob> {
    const response = await api.post('/api/videos/batch-export-srt', {
        videoIds,
    }, {
        responseType: 'blob',
    });
    return response.data;
}

// Health check
export async function checkHealth(): Promise<boolean> {
    try {
        const response = await api.get('http://localhost:8001/health');
        return response.data.status === 'ok';
    } catch {
        return false;
    }
}

// Regenerate timeline for a video

export async function renameVideo(videoId: string, newName: string) {
    const response = await api.put(`/api/videos/${videoId}/rename`, { newName });
    return response.data;
}

export async function regenerateTimeline(videoId: string): Promise<{ success: boolean; timeline: any[]; count: number }> {
    const response = await api.post(`/api/videos/${videoId}/regenerate-timeline`);
    return response.data;
}
