// Continuous Voice Recognition Service for Real-time Conversation
// Auto-starts when mic is on, continuously listens and sends final results

export class ContinuousVoiceService {
    private recognition: any;
    private isRunning: boolean = false;
    private onTranscript: ((text: string, isFinal: boolean) => void) | null = null;

    constructor() {
        // Initialize Web Speech API
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.error('[Voice] Speech Recognition not supported');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;  // Continuous recognition
        this.recognition.interimResults = true;  // Get interim results
        this.recognition.lang = 'zh-CN';  // Chinese
        this.recognition.maxAlternatives = 1;

        this.setupHandlers();
    }

    private setupHandlers() {
        this.recognition.onresult = (event: any) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const transcript = result[0].transcript;
                const isFinal = result.isFinal;

                console.log(`[Voice] ${isFinal ? 'Final' : 'Interim'}: ${transcript}`);

                if (this.onTranscript) {
                    this.onTranscript(transcript, isFinal);
                }
            }
        };

        this.recognition.onerror = (event: any) => {
            console.error('[Voice] Recognition error:', event.error);

            // Auto-restart on certain errors
            if (event.error === 'no-speech' || event.error === 'audio-capture') {
                console.log('[Voice] Auto-restarting...');
                setTimeout(() => {
                    if (this.isRunning) {
                        this.recognition.start();
                    }
                }, 1000);
            }
        };

        this.recognition.onend = () => {
            console.log('[Voice] Recognition ended');

            // Auto-restart if still supposed to be running
            if (this.isRunning) {
                console.log('[Voice] Auto-restarting continuous recognition...');
                try {
                    this.recognition.start();
                } catch (e) {
                    console.error('[Voice] Restart failed:', e);
                }
            }
        };
    }

    start(onTranscript: (text: string, isFinal: boolean) => void) {
        if (this.isRunning) {
            console.warn('[Voice] Already running');
            return;
        }

        console.log('[Voice] Starting continuous recognition...');
        this.onTranscript = onTranscript;
        this.isRunning = true;

        try {
            this.recognition.start();
        } catch (e) {
            console.error('[Voice] Start failed:', e);
            this.isRunning = false;
        }
    }

    stop() {
        console.log('[Voice] Stopping continuous recognition...');
        this.isRunning = false;
        this.onTranscript = null;

        try {
            this.recognition.stop();
        } catch (e) {
            console.error('[Voice] Stop failed:', e);
        }
    }

    isActive(): boolean {
        return this.isRunning;
    }
}
