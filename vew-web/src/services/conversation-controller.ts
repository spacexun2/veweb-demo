/**
 * Integrated AI Conversation Controller
 * 
 * Orchestrates all services for seamless AI conversation:
 * - WebSocket communication
 * - Streaming message handling
 * - Voice recognition with VAD
 * - Barge-in (interrupt)
 * - Hands-free mode
 * - State machine
 * 
 * Usage:
 * const controller = new AIConversationController(sessionId);
 * controller.startRecording();
 * controller.enableHandsFree();
 */

import { RealtimeAIServiceEnhanced } from './realtime-enhanced';
import { StreamingMessageHandler } from './streaming-handler';
import { VoiceRecognitionService } from './voice';
import { VADService } from './vad';
import { BargeInService } from './barge-in';
import { HandsFreeService } from './hands-free';
import { ConversationStateMachine, ConversationState } from './state-machine';
import { TTSService } from './tts';

export interface ConversationConfig {
    enableVAD: boolean;
    enableBargeIn: boolean;
    enableHandsFree: boolean;
    vadSilenceThreshold: number;
}

export class AIConversationController {
    // Core services
    private wsService: RealtimeAIServiceEnhanced;
    private streamingHandler: StreamingMessageHandler;
    private voiceService: VoiceRecognitionService;
    private vadService: VADService;
    private bargeInService: BargeInService;
    private handsFreeService: HandsFreeService;
    private stateMachine: ConversationStateMachine;
    private ttsService: TTSService;

    // State
    private isRecording: boolean = false;
    private config: ConversationConfig;

    // Callbacks
    private onMessagesUpdate: (messages: any[]) => void;
    private onStateChange: (state: ConversationState) => void;

    constructor(
        sessionId: string,
        ttsService: TTSService,
        onMessagesUpdate: (messages: any[]) => void,
        onStateChange: (state: ConversationState) => void,
        config?: Partial<ConversationConfig>
    ) {
        this.onMessagesUpdate = onMessagesUpdate;
        this.onStateChange = onStateChange;
        this.ttsService = ttsService;

        // Default config
        this.config = {
            enableVAD: true,
            enableBargeIn: true,
            enableHandsFree: false,
            vadSilenceThreshold: 800,
            ...config
        };

        // Initialize state machine
        this.stateMachine = new ConversationStateMachine();
        this.stateMachine.addListener((state, prevState) => {
            this.onStateChange(state);
        });

        // Initialize WebSocket
        this.wsService = new RealtimeAIServiceEnhanced(sessionId);

        // Initialize streaming handler
        this.streamingHandler = new StreamingMessageHandler(
            ttsService,
            onMessagesUpdate,
            (speaking) => this.handleAISpeakingChange(speaking)
        );

        // Initialize voice recognition
        this.voiceService = new VoiceRecognitionService();

        // Initialize VAD
        this.vadService = new VADService({
            silenceThreshold: this.config.vadSilenceThreshold,
            enabled: this.config.enableVAD
        });

        this.vadService.setAutoSendCallback((text) => {
            this.sendMessage(text);
        });

        // Initialize barge-in
        this.bargeInService = new BargeInService(ttsService);
        this.bargeInService.setEnabled(this.config.enableBargeIn);
        this.bargeInService.setInterruptCallback(() => {
            this.stateMachine.interrupt();
        });

        // Initialize hands-free
        this.handsFreeService = new HandsFreeService(
            this.stateMachine,
            this.voiceService,
            this.vadService
        );

        if (this.config.enableHandsFree) {
            this.handsFreeService.enable();
        }
    }

    /**
     * Start recording and conversation
     */
    startRecording(): void {
        if (this.isRecording) {
            return;
        }

        console.log('[Controller] 🎬 Starting recording...');
        this.isRecording = true;

        // Connect WebSocket
        this.wsService.connect((message) => {
            this.streamingHandler.handleMessage(message);
        });

        // Start voice recognition
        this.voiceService.start(
            (transcript, isFinal) => this.handleVoiceTranscript(transcript, isFinal),
            (error) => console.error('[Controller] Voice error:', error)
        );

        // Set initial state
        this.stateMachine.startListening();
    }

    /**
     * Stop recording
     */
    stopRecording(): void {
        if (!this.isRecording) {
            return;
        }

        console.log('[Controller] 🛑 Stopping recording...');
        this.isRecording = false;

        // End session
        this.wsService.endSession();
        this.wsService.disconnect();

        // Stop voice
        this.voiceService.stop();

        // Stop hands-free
        this.handsFreeService.disable();

        // Set idle state
        this.stateMachine.stop();
    }

    /**
     * Send frame data
     */
    sendFrame(frameData: string, timestamp: number): void {
        this.wsService.sendFrame(frameData, timestamp);
    }

    /**
     * Send message manually
     */
    sendMessage(text: string): void {
        if (!text || text.trim().length === 0) {
            return;
        }

        console.log('[Controller] 📤 Sending message:', text);

        // Add to UI
        this.streamingHandler.addUserMessage(text);

        // Send to backend
        this.wsService.sendMessage(text, Date.now() / 1000);

        // Reset VAD
        this.vadService.reset();

        // Update state
        this.stateMachine.startThinking();
    }

    /**
     * Enable/disable hands-free mode
     */
    toggleHandsFree(): boolean {
        return this.handsFreeService.toggle();
    }

    /**
     * Get current state
     */
    getState(): ConversationState {
        return this.stateMachine.getState();
    }

    /**
     * Get state emoji
     */
    getStateEmoji(): string {
        return this.stateMachine.getStateEmoji();
    }

    /**
     * Handle voice transcript
     */
    private handleVoiceTranscript(transcript: string, isFinal: boolean): void {
        // Check for barge-in
        if (!isFinal) {
            this.bargeInService.onUserSpeechStart();
        }

        // VAD processing
        if (this.config.enableVAD) {
            this.vadService.onSpeech(transcript, isFinal);
        }
    }

    /**
     * Handle AI speaking status change
     */
    private handleAISpeakingChange(speaking: boolean): void {
        // Update barge-in
        this.bargeInService.setAISpeaking(speaking);

        // Update state machine
        if (speaking) {
            this.stateMachine.startSpeaking();
        } else {
            // AI finished speaking
            this.handsFreeService.onAIFinishedSpeaking();
        }
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<ConversationConfig>): void {
        this.config = { ...this.config, ...config };

        // Update services
        if (config.enableVAD !== undefined) {
            this.vadService.updateConfig({ enabled: config.enableVAD });
        }

        if (config.enableBargeIn !== undefined) {
            this.bargeInService.setEnabled(config.enableBargeIn);
        }

        if (config.vadSilenceThreshold !== undefined) {
            this.vadService.updateConfig({ silenceThreshold: config.vadSilenceThreshold });
        }
    }

    /**
     * Cleanup
     */
    destroy(): void {
        this.stopRecording();
        this.handsFreeService.destroy();
        this.vadService.destroy();
    }
}
