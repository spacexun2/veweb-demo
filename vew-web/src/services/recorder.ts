import type { RecordingOptions } from '../types';

export class ScreenRecorder {
    public mediaRecorder: MediaRecorder | null = null;
    private recordedChunks: Blob[] = [];
    private stream: MediaStream | null = null;

    get state(): RecordingState {
        return this.mediaRecorder?.state || 'inactive';
    }

    async startRecording(options: RecordingOptions = {}): Promise<void> {
        try {
            // 1. Request screen recording permission
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true, // Request tab audio (only works for Browser Tab)
            });

            // 2. Request microphone audio (for Window/Screen sharing scenarios)
            let micStream: MediaStream | null = null;
            try {
                micStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                    video: false
                });
                console.log('✅ Microphone audio enabled');
            } catch (err) {
                console.warn('⚠️ Microphone access denied, continuing without mic audio:', err);
                // Continue without mic - user may have denied permission
            }

            // 3. (Optional) Add camera
            let cameraStream: MediaStream | null = null;
            if (options.includeCamera) {
                try {
                    cameraStream = await navigator.mediaDevices.getUserMedia({
                        video: { width: 320, height: 240 },
                        audio: false
                    });
                } catch (err) {
                    console.warn('Camera access denied:', err);
                }
            }

            // 4. Combine all tracks
            const tracks = [
                ...displayStream.getVideoTracks(),
                ...displayStream.getAudioTracks(), // Tab audio (if available)
            ];

            // Add microphone audio track
            if (micStream) {
                tracks.push(...micStream.getAudioTracks());
            }

            if (cameraStream) {
                tracks.push(...cameraStream.getVideoTracks());
            }

            this.stream = new MediaStream(tracks);

            // 5. Create MediaRecorder
            const mimeType = this.getSupportedMimeType();
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType,
                videoBitsPerSecond: options.videoBitrate || 2500000, // 2.5Mbps
                audioBitsPerSecond: options.audioBitrate || 128000,  // 128kbps
            });

            // 6. Listen to data
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            // 7. Handle user stopping screen share
            this.stream.getVideoTracks()[0].onended = () => {
                console.log('User stopped screen sharing');
                this.stopRecording();
            };

            // 8. Start recording
            this.mediaRecorder.start(1000); // Save data every 1 second

        } catch (error) {
            console.error('Recording failed:', error);
            throw error;
        }
    }

    async stopRecording(): Promise<Blob> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) {
                reject(new Error('Recorder not initialized'));
                return;
            }

            this.mediaRecorder.onstop = () => {
                const mimeType = this.mediaRecorder?.mimeType || 'video/webm';
                const blob = new Blob(this.recordedChunks, { type: mimeType });

                // Cleanup
                this.cleanup();

                resolve(blob);
            };

            this.mediaRecorder.stop();
        });
    }

    pauseRecording(): void {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.pause();
        }
    }

    resumeRecording(): void {
        if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
            this.mediaRecorder.resume();
        }
    }

    getState(): RecordingState {
        if (!this.mediaRecorder) return 'inactive';
        return this.mediaRecorder.state;
    }

    private getSupportedMimeType(): string {
        const types = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm',
            'video/mp4',
        ];

        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }

        return 'video/webm';
    }

    private cleanup(): void {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.recordedChunks = [];
        this.mediaRecorder = null;
    }

    getStream(): MediaStream | null {
        return this.stream;
    }
}

type RecordingState = 'inactive' | 'recording' | 'paused';
