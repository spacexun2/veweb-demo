/**
 * Voice Activity Detection (VAD) Service
 * 
 * Features:
 * - Silence detection
 * - Auto-send on sentence end
 * - Configurable thresholds
 * - Compatible with Web Speech API
 */

export type VADCallback = (text: string) => void;

export interface VADConfig {
    silenceThreshold: number; // ms, default 800
    minTextLength: number; // chars, default 2
    enabled: boolean;
}

export class VADService {
    private silenceTimer: number | null = null;
    private accumulatedText: string = '';
    private onAutoSend: VADCallback | null = null;
    private config: VADConfig;

    constructor(config?: Partial<VADConfig>) {
        this.config = {
            silenceThreshold: config?.silenceThreshold || 800,
            minTextLength: config?.minTextLength || 2,
            enabled: config?.enabled !== false
        };
    }

    /**
     * Called when user speaks (interim or final transcript)
     */
    onSpeech(transcript: string, isFinal: boolean): void {
        if (!this.config.enabled) {
            return;
        }

        // Reset silence timer
        this.resetSilenceTimer();

        // Accumulate text
        if (isFinal) {
            this.accumulatedText += transcript;
            console.log('[VAD] Accumulated:', this.accumulatedText);
        }

        // Start silence detection
        this.startSilenceDetection();
    }

    /**
     * Reset accumulated text (after sending)
     */
    reset(): void {
        this.accumulatedText = '';
        this.clearSilenceTimer();
    }

    /**
     * Set auto-send callback
     */
    setAutoSendCallback(callback: VADCallback): void {
        this.onAutoSend = callback;
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<VADConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current configuration
     */
    getConfig(): VADConfig {
        return { ...this.config };
    }

    private startSilenceDetection(): void {
        this.clearSilenceTimer();

        this.silenceTimer = window.setTimeout(() => {
            // Silence detected - auto send if text is long enough
            if (this.accumulatedText.trim().length >= this.config.minTextLength) {
                console.log(`[VAD] 🔇 Silence detected (${this.config.silenceThreshold}ms) - Auto sending:`,
                    this.accumulatedText);

                if (this.onAutoSend) {
                    this.onAutoSend(this.accumulatedText.trim());
                }

                this.accumulatedText = '';
            }
        }, this.config.silenceThreshold);
    }

    private resetSilenceTimer(): void {
        this.clearSilenceTimer();
    }

    private clearSilenceTimer(): void {
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
    }

    /**
     * Cleanup
     */
    destroy(): void {
        this.clearSilenceTimer();
        this.accumulatedText = '';
        this.onAutoSend = null;
    }
}
