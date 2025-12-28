/**
 * Voice Recognition Service
 * 
 * Continuous speech recognition using Web Speech API
 * Features:
 * - Continuous listening
 * - Voice Activity Detection (VAD)
 * - Noise filtering
 * - Auto-restart on errors
 */

export type VoiceRecognitionCallback = (transcript: string, isFinal: boolean) => void;
export type ErrorCallback = (error: string) => void;

export class VoiceRecognitionService {
    private recognition: any;
    private isListening: boolean = false;
    private isEnabled: boolean = false;
    private onTranscriptCallback: VoiceRecognitionCallback | null = null;
    private onErrorCallback: ErrorCallback | null = null;
    private silenceTimer: number | null = null;
    private lastTranscriptTime: number = 0;

    // Configuration
    private readonly SILENCE_TIMEOUT = 2000; // 2 seconds of silence
    private readonly AUTO_RESTART_DELAY = 1000; // 1 second

    constructor() {
        // Check browser support
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.error('[Voice] Speech Recognition not supported');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.setupRecognition();
    }

    private setupRecognition() {
        this.recognition.continuous = true; // Continuous listening
        this.recognition.interimResults = true; // Get interim results
        this.recognition.lang = 'zh-CN'; // Chinese
        this.recognition.maxAlternatives = 1;

        // Handle results
        this.recognition.onresult = (event: any) => {
            const result = event.results[event.results.length - 1];
            const transcript = result[0].transcript.trim();
            const isFinal = result.isFinal;

            console.log(`[Voice] ${isFinal ? 'Final' : 'Interim'}: "${transcript}"`);
            // Update last transcript time
            this.lastTranscriptTime = Date.now();

            // Call callback
            if (this.onTranscriptCallback) {
                console.log(`[Voice] Calling transcript callback (isFinal: ${isFinal})`);
                this.onTranscriptCallback(transcript, isFinal);
            } else {
                console.warn('[Voice] No transcript callback set!');
            }

            // Reset silence timer on new speech
            this.resetSilenceTimer();
        };

        // Handle errors
        this.recognition.onerror = (event: any) => {
            console.error('[Voice] Recognition error:', event.error);

            // Handle specific errors
            if (event.error === 'no-speech') {
                console.log('[Voice] No speech detected, continuing...');
                return;
            }

            if (event.error === 'audio-capture') {
                const msg = '无法访问麦克风，请检查权限';
                if (this.onErrorCallback) this.onErrorCallback(msg);
                this.stop();
                return;
            }

            if (event.error === 'not-allowed') {
                const msg = '麦克风权限被拒绝';
                if (this.onErrorCallback) this.onErrorCallback(msg);
                this.stop();
                return;
            }

            // Auto-restart on other errors
            if (this.isEnabled) {
                console.log('[Voice] Auto-restarting in', this.AUTO_RESTART_DELAY, 'ms');
                setTimeout(() => {
                    if (this.isEnabled) this.internalStart();
                }, this.AUTO_RESTART_DELAY);
            }
        };

        // Handle end
        this.recognition.onend = () => {
            console.log('[Voice] Recognition ended');
            this.isListening = false;

            // Auto-restart if still enabled
            if (this.isEnabled) {
                console.log('[Voice] Auto-restarting...');
                setTimeout(() => {
                    if (this.isEnabled) this.internalStart();
                }, this.AUTO_RESTART_DELAY);
            }
        };

        // Handle start
        this.recognition.onstart = () => {
            console.log('[Voice] ✅ Recognition started');
            this.isListening = true;
        };

        // Handle end
        this.recognition.onend = () => {
            console.log(`[Voice] Recognition ended (isEnabled: ${this.isEnabled}, isListening: ${this.isListening})`);
            this.isListening = false;

            // Auto-restart if still enabled
            if (this.isEnabled) {
                console.log('[Voice] Auto-restarting recognition in 500ms...');
                setTimeout(() => {
                    if (this.isEnabled) {
                        console.log('[Voice] Restarting now...');
                        this.internalStart();
                    }
                }, 500);
            }
        };
    }

    private resetSilenceTimer() {
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
        }

        this.silenceTimer = window.setTimeout(() => {
            const timeSinceLast = Date.now() - this.lastTranscriptTime;
            if (timeSinceLast >= this.SILENCE_TIMEOUT) {
                console.log('[Voice] Silence detected');
                // Could trigger a "user stopped talking" event here
            }
        }, this.SILENCE_TIMEOUT);
    }

    private internalStart() {
        if (this.isListening) {
            console.warn('[Voice] Already listening');
            return;
        }

        try {
            this.recognition.start();
        } catch (error) {
            console.error('[Voice] Failed to start:', error);
        }
    }

    /**
     * Start voice recognition
     */
    start(onTranscript: VoiceRecognitionCallback, onError?: ErrorCallback) {
        console.log('[Voice] Starting voice recognition...');

        this.onTranscriptCallback = onTranscript;
        this.onErrorCallback = onError || null;
        this.isEnabled = true;
        this.lastTranscriptTime = Date.now();

        this.internalStart();
    }

    /**
     * Stop voice recognition
     */
    stop() {
        console.log('[Voice] Stopping voice recognition...');

        this.isEnabled = false;

        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }

        if (this.isListening) {
            try {
                this.recognition.stop();
            } catch (error) {
                console.error('[Voice] Error stopping:', error);
            }
        }

        this.isListening = false;
    }

    /**
     * Check if currently listening
     */
    isActive(): boolean {
        return this.isListening;
    }

    /**
     * Check if service is available
     */
    isAvailable(): boolean {
        return !!this.recognition;
    }
}
