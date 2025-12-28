/**
 * Barge-in Service - Interrupt AI while speaking
 * 
 * Features:
 * - Detect user speech-start during AI speaking
 * - Stop TTS playback immediately
 * - Cancel ongoing AI generation
 * - Fast response (<200ms)
 */

import { TTSService } from './tts';

export type InterruptCallback = () => void;

export class BargeInService {
    private isAISpeaking: boolean = false;
    private ttsService: TTSService | null = null;
    private onInterrupt: InterruptCallback | null = null;
    private enabled: boolean = true;

    constructor(ttsService?: TTSService) {
        this.ttsService = ttsService || null;
    }

    /**
     * Set TTS service
     */
    setTTSService(ttsService: TTSService): void {
        this.ttsService = ttsService;
    }

    /**
     * Set callback for when interrupt occurs
     */
    setInterruptCallback(callback: InterruptCallback): void {
        this.onInterrupt = callback;
    }

    /**
     * Update AI speaking status
     */
    setAISpeaking(speaking: boolean): void {
        this.isAISpeaking = speaking;

        if (speaking) {
            console.log('[BargeIn] 🎤 AI started speaking');
        } else {
            console.log('[BargeIn] 🔇 AI stopped speaking');
        }
    }

    /**
     * Detect user speech-start (call from voice recognition)
     */
    onUserSpeechStart(): void {
        if (!this.enabled) {
            return;
        }

        if (this.isAISpeaking) {
            console.log('[BargeIn] 🛑 User interrupted AI - stopping playback');
            this.interrupt();
        }
    }

    /**
     * Perform interrupt
     */
    private interrupt(): void {
        // Stop TTS immediately
        if (this.ttsService) {
            this.ttsService.stop();
        }

        // Update state
        this.isAISpeaking = false;

        // Notify callback
        if (this.onInterrupt) {
            this.onInterrupt();
        }

        console.log('[BargeIn] ✅ Interrupt complete');
    }

    /**
     * Enable/disable barge-in
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        console.log(`[BargeIn] ${enabled ? '✅ Enabled' : '❌ Disabled'}`);
    }

    /**
     * Check if currently enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Get current AI speaking status
     */
    isAICurrentlySpeaking(): boolean {
        return this.isAISpeaking;
    }
}
