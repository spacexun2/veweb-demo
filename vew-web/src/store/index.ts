import { create } from 'zustand';
import type { Video } from '../types';

interface AppState {
    // Videos
    videos: Video[];
    selectedVideoIds: Set<string>;
    currentVideo: Video | null;

    // Recording
    isRecording: boolean;
    recordingDuration: number;
    recordedBlob: Blob | null;

    // Upload
    isUploading: boolean;
    uploadProgress: number;

    // UI
    isLoading: boolean;
    error: string | null;

    // Actions
    setVideos: (videos: Video[]) => void;
    addVideo: (video: Video) => void;
    updateVideo: (id: string, updates: Partial<Video>) => void;
    removeVideo: (id: string) => void;
    setCurrentVideo: (video: Video | null) => void;

    toggleVideoSelection: (id: string) => void;
    clearSelection: () => void;
    selectAll: () => void;

    setRecording: (isRecording: boolean) => void;
    setRecordingDuration: (duration: number) => void;
    setRecordedBlob: (blob: Blob | null) => void;

    setUploading: (isUploading: boolean) => void;
    setUploadProgress: (progress: number) => void;

    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
    // Initial state
    videos: [],
    selectedVideoIds: new Set(),
    currentVideo: null,

    isRecording: false,
    recordingDuration: 0,
    recordedBlob: null,

    isUploading: false,
    uploadProgress: 0,

    isLoading: false,
    error: null,

    // Actions
    setVideos: (videos) => set({ videos }),

    addVideo: (video) => set((state) => ({
        videos: [video, ...state.videos]
    })),

    updateVideo: (id, updates) => set((state) => ({
        videos: state.videos.map(v => v.id === id ? { ...v, ...updates } : v)
    })),

    removeVideo: (id) => set((state) => ({
        videos: state.videos.filter(v => v.id !== id),
        selectedVideoIds: new Set([...state.selectedVideoIds].filter(vid => vid !== id))
    })),

    setCurrentVideo: (video) => set({ currentVideo: video }),

    toggleVideoSelection: (id) => set((state) => {
        const newSet = new Set(state.selectedVideoIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        return { selectedVideoIds: newSet };
    }),

    clearSelection: () => set({ selectedVideoIds: new Set() }),

    selectAll: () => set((state) => ({
        selectedVideoIds: new Set(state.videos.map(v => v.id))
    })),

    setRecording: (isRecording) => set({ isRecording }),
    setRecordingDuration: (recordingDuration) => set({ recordingDuration }),
    setRecordedBlob: (recordedBlob) => set({ recordedBlob }),

    setUploading: (isUploading) => set({ isUploading }),
    setUploadProgress: (uploadProgress) => set({ uploadProgress }),

    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
}));
