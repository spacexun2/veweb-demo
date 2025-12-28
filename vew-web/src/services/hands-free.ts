/**
 * Hands-Free Mode Service
 * 
 * Enables continuous conversation without manual button presses:
 * - Auto-start voice recognition when recording
 * - Auto-return to listening after AI speaks
 * - One-click to enable/disable
 * 
 * Flow: LISTENING → auto-send → THINKING → SPEAKING → LISTENING (loop)
 */

import { ConversationStateMachine, ConversationState } from './state-machine';
import { VoiceRecognitionService } from './voice';
import { VADService } from './vad';

export interface HandsFreeConfig {
    enabled: boolean;
    autoResumeAfterAI: boolean;
    cooldownMs: number; // Delay before resuming after AI speaks
}

export class HandsFreeService {
    private stateMachine: ConversationStateMachine;
    private voiceService: VoiceRecognitionService | null = null;
    private vadService: VADService | null = null;
    private config: HandsFreeConfig;
    private resumeTimer: number | null = null;

    constructor(
        stateMachine: ConversationStateMachine,
        voiceService?: VoiceRecognitionService,
        vadService?: VADService
    ) {
        this.stateMachine = stateMachine;
        this.voiceService = voiceService || null;
        this.vadService = vadService || null;

        this.config = {
            enabled: false,
            autoResumeAfterAI: true,
            cooldownMs: 300 // 300ms cooldown to avoid AI tail being recognized
        };

        // Listen to state changes
        this.stateMachine.addListener(this.handleStateChange.bind(this));
    }

    /**
     * Enable hands-free mode
     */
    enable(): void {
        if (this.config.enabled) {
            return;
        }

        console.log('[HandsFree] 🎤 Enabling hands-free mode');
        this.config.enabled = true;

        // Start listening immediately
        if (this.voiceService) {
            this.startListening();
        }
    }

    /**
     * Disable hands-free mode
     */
    disable(): void {
        if (!this.config.enabled) {
            return;
        }

        console.log('[HandsFree] 🔇 Disabling hands-free mode');
        this.config.enabled = false;

        // Stop listening
        if (this.voiceService) {
            this.voiceService.stop();
        }

        // Clear any resume timer
        this.clearResumeTimer();

        // Return to idle
        this.stateMachine.stop();
    }

    /**
     * Toggle hands-free mode
     */
    toggle(): boolean {
        if (this.config.enabled) {
            this.disable();
            return false;
        } else {
            this.enable();
            return true;
        }
    }

    /**
     * Check if enabled
     */
    isEnabled(): boolean {
        return this.config.enabled;
    }

    /**
     * Set voice service
     */
    setVoiceService(voiceService: VoiceRecognitionService): void {
        this.voiceService = voiceService;
    }

    /**
     * Set VAD service
     */
    setVADService(vadService: VADService): void {
        this.vadService = vadService;
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<HandsFreeConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Handle state changes
     */
    private handleStateChange(newState: ConversationState, prevState: ConversationState): void {
        if (!this.config.enabled) {
            return;
        }

        console.log(`[HandsFree] State: ${prevState} → ${newState}`);

        switch (newState) {
            case ConversationState.LISTENING:
                // Auto-start voice recognition
                this.startListening();
                break;

            case ConversationState.THINKING:
                // Stop listening while waiting for AI
                this.stopListening();
                break;

            case ConversationState.SPEAKING:
                // AI is speaking, ensure listening is stopped
                this.stopListening();
                break;

            case ConversationState.INTERRUPTED:
                // User interrupted, immediately start listening
                this.startListening();
                break;

            case ConversationState.IDLE:
                // Stop everything
                this.stopListening();
                break;
        }
    }

    /**
     * Called when AI finishes speaking
     */
    onAIFinishedSpeaking(): void {
        if (!this.config.enabled || !this.config.autoResumeAfterAI) {
            return;
        }

        console.log(`[HandsFree] AI finished - resuming in ${this.config.cooldownMs}ms`);

        // Clear any existing timer
        this.clearResumeTimer();

        // Resume listening after cooldown
        this.resumeTimer = window.setTimeout(() => {
            if (this.config.enabled) {
                console.log('[HandsFree] 🔄 Resuming listening...');
                this.stateMachine.startListening();
            }
        }, this.config.cooldownMs);
    }

    /**
     * Start listening
     */
    private startListening(): void {
        if (!this.voiceService) {
            console.warn('[HandsFree] No voice service available');
            return;
        }

        if (!this.voiceService.isActive()) {
            console.log('[HandsFree] 👂 Starting voice recognition...');
            // Voice service callbacks should be set up externally
            // This just ensures it's started
            this.voiceService.start(
                () => { },  // Placeholder - actual callbacks set externally
                () => { }
            );
        }
    }

    /**
     * Stop listening
     */
    private stopListening(): void {
        if (this.voiceService && this.voiceService.isActive()) {
            console.log('[HandsFree] 🔇 Stopping voice recognition...');
            this.voiceService.stop();
        }
    }

    /**
     * Clear resume timer
     */
    private clearResumeTimer(): void {
        if (this.resumeTimer) {
            clearTimeout(this.resumeTimer);
            this.resumeTimer = null;
        }
    }

    /**
     * Cleanup
     */
    destroy(): void {
        this.disable();
        this.clearResumeTimer();
    }
}
