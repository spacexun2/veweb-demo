/**
 * Text-to-Speech Service with Audio Queue
 * 
 * Features:
 * - Pre-synthesis audio queue for seamless playback
 * - Interruptible playback on new user messages
 * - Cloud-only TTS (Qwen3-TTS-Flash)
 */

export type TTSCallback = (isPlaying: boolean) => void;

export class TTSService {
    private audioQueue: HTMLAudioElement[] = [];
    private synthesisQueue: Promise<HTMLAudioElement>[] = [];
    private isProcessingQueue: boolean = false;
    private isPlaying: boolean = false;
    private onStatusChange: TTSCallback | null = null;
    private currentAudio: HTMLAudioElement | null = null;

    constructor() {
        console.log('[TTS] Initializing cloud-only TTS with ordered queue');
    }

    /**
     * Synthesize and queue audio for playback (maintains order)
     */
    async play(text: string, callback?: TTSCallback): Promise<void> {
        if (!text || text.trim().length === 0) {
            console.log('[TTS] Empty text, skipping');
            return;
        }

        console.log(`[TTS] 🎵 Queuing synthesis: "${text.substring(0, 50)}..."`);

        // Store callback
        if (callback) {
            this.onStatusChange = callback;
        }

        // Start synthesis immediately (parallel)
        console.log(`[TTS] Starting synthesis for: "${text.substring(0, 30)}..."`);
        const synthesisPromise = this.synthesizeToAudio(text);

        // Add to synthesis queue (maintains order)
        this.synthesisQueue.push(synthesisPromise);

        // Process queue in order
        if (!this.isProcessingQueue) {
            this.processQueue();
        }
    }

    /**
     * Process synthesis queue in order
     */
    private async processQueue() {
        if (this.isProcessingQueue) return;

        this.isProcessingQueue = true;

        try {
            while (this.synthesisQueue.length > 0) {
                // Wait for FIRST promise to complete (ensures order)
                const audio = await this.synthesisQueue.shift()!;

                // Add to playback queue
                this.audioQueue.push(audio);
                console.log(`[TTS] ✅ Audio synthesized and queued (synthesis queue: ${this.synthesisQueue.length}, playback queue: ${this.audioQueue.length})`);

                // Start playback if idle
                if (!this.isPlaying) {
                    console.log('[TTS] Starting playback from idle state');
                    this.isPlaying = true;
                    if (this.onStatusChange) this.onStatusChange(true);
                    this.playNext();
                }
            }
        } finally {
            this.isProcessingQueue = false;
        }
    }

    /**
     * Stop playback and clear queue (for interruptions)
     */
    stop(): void {
        console.log('[TTS] ⏹️ Stopping and clearing all queues');

        if (this.currentAudio) {
            this.currentAudio.pause();
            URL.revokeObjectURL(this.currentAudio.src);
            this.currentAudio = null;
        }

        // Clear synthesis queue
        this.synthesisQueue = [];

        // Clear audio queue
        for (const audio of this.audioQueue) {
            URL.revokeObjectURL(audio.src);
        }
        this.audioQueue = [];

        this.isPlaying = false;
        this.isProcessingQueue = false;
        if (this.onStatusChange) this.onStatusChange(false);
    }

    /**
     * Play next audio from queue
     */
    private async playNext() {
        if (this.audioQueue.length === 0) {
            this.isPlaying = false;
            if (this.onStatusChange) this.onStatusChange(false);
            console.log('[TTS] ✅ Queue empty, playback complete');
            return;
        }

        // Get pre-synthesized audio
        this.currentAudio = this.audioQueue.shift()!;
        console.log(`[TTS] ▶️ Playing (${this.audioQueue.length} remaining)`);

        this.currentAudio.onended = () => {
            console.log('[TTS] ✅ Audio finished');
            if (this.currentAudio) {
                URL.revokeObjectURL(this.currentAudio.src);
                this.currentAudio = null;
            }
            this.playNext();
        };

        this.currentAudio.onerror = (e) => {
            console.error('[TTS] ❌ Playback error:', e);
            if (this.currentAudio) {
                URL.revokeObjectURL(this.currentAudio.src);
                this.currentAudio = null;
            }
            this.playNext();
        };

        try {
            await this.currentAudio.play();
        } catch (err) {
            console.error('[TTS] Play failed:', err);
            this.playNext();
        }
    }

    /**
     * Synthesize text to Audio object
     */
    private async synthesizeToAudio(text: string): Promise<HTMLAudioElement> {
        const response = await fetch('http://localhost:3001/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`TTS API error ${response.status}: ${errorText}`);
        }

        const audioBlob = await response.blob();
        console.log(`[TTS] 🎧 Synthesizing ${audioBlob.size} bytes for: "${text.substring(0, 30)}..."`);

        const audioUrl = URL.createObjectURL(audioBlob);
        return new Audio(audioUrl);
    }

    /**
     * Get current queue size
     */
    getQueueSize(): number {
        return this.audioQueue.length;
    }

    /**
     * Check if currently playing
     */
    isSpeaking(): boolean {
        return this.isPlaying;
    }
}
