/**
 * Cloud ASR Service using DashScope (Future Enhancement)
 * 
 * Current: Uses enhanced Web Speech API with better configuration
 * Future: Will integrate DashScope Paraformer for higher quality
 */

export interface ASRResult {
    text: string;
    isFinal: boolean;
    confidence?: number;
}

export class CloudASRService {
    private recognition: any = null;
    private onResultCallback: ((result: ASRResult) => void) | null = null;
    private onErrorCallback: ((error: string) => void) | null = null;
    private isRunning = false;

    async start(
        onResult: (result: ASRResult) => void,
        onError?: (error: string) => void
    ): Promise<void> {
        if (this.isRunning) {
            console.warn('[CloudASR] Already running');
            return;
        }

        this.onResultCallback = onResult;
        this.onErrorCallback = onError || null;

        try {
            // Use Web Speech API with enhanced config
            // @ts-ignore
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

            if (!SpeechRecognition) {
                throw new Error('Speech Recognition not supported');
            }

            this.recognition = new SpeechRecognition();

            // Enhanced configuration
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'zh-CN';
            this.recognition.maxAlternatives = 3;

            this.recognition.onresult = (event: any) => {
                const result = event.results[event.results.length - 1];
                const transcript = result[0].transcript;
                const confidence = result[0].confidence;
                const isFinal = result.isFinal;

                if (this.onResultCallback) {
                    this.onResultCallback({
                        text: transcript,
                        isFinal,
                        confidence
                    });
                }
            };

            this.recognition.onerror = (event: any) => {
                console.error('[CloudASR] Error:', event.error);
                if (this.onErrorCallback) {
                    this.onErrorCallback(event.error);
                }
            };

            this.recognition.onend = () => {
                // Auto-restart for continuous recognition
                if (this.isRunning) {
                    setTimeout(() => {
                        if (this.isRunning && this.recognition) {
                            this.recognition.start();
                        }
                    }, 500);
                }
            };

            this.recognition.start();
            this.isRunning = true;
            console.log('[CloudASR] Started (using enhanced Web Speech API)');

        } catch (error) {
            console.error('[CloudASR] Failed to start:', error);
            if (this.onErrorCallback) {
                this.onErrorCallback(`Failed to start: ${error}`);
            }
            throw error;
        }
    }

    stop(): void {
        this.isRunning = false;
        if (this.recognition) {
            this.recognition.stop();
            this.recognition = null;
        }
        console.log('[CloudASR] Stopped');
    }

    isActive(): boolean {
        return this.isRunning;
    }
}

// Note: Future integration with DashScope Paraformer will require:
// 1. Backend WebSocket endpoint for audio streaming
// 2. Audio encoding (PCM 16kHz)
// 3. DashScope API key configuration
// 4. Handling streaming results
