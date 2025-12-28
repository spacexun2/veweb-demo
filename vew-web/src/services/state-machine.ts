/**
 * Conversation State Machine
 * 
 * Manages the state flow of AI conversation:
 * LISTENING → THINKING → SPEAKING → INTERRUPTED → LISTENING
 * 
 * Features:
 * - Clear state transitions
 * - State-based behavior control
 * - Event-driven architecture
 */

export enum ConversationState {
    IDLE = 'idle',           // Not in conversation
    LISTENING = 'listening', // Collecting user input
    THINKING = 'thinking',   // Waiting for AI response
    SPEAKING = 'speaking',   // AI is speaking
    INTERRUPTED = 'interrupted' // User interrupted AI
}

export type StateChangeListener = (state: ConversationState, prevState: ConversationState) => void;

export class ConversationStateMachine {
    private currentState: ConversationState = ConversationState.IDLE;
    private listeners: StateChangeListener[] = [];
    private stateHistory: ConversationState[] = [];
    private readonly MAX_HISTORY = 10;

    constructor() {
        this.stateHistory.push(this.currentState);
    }

    /**
     * Get current state
     */
    getState(): ConversationState {
        return this.currentState;
    }

    /**
     * Check if in specific state
     */
    is(state: ConversationState): boolean {
        return this.currentState === state;
    }

    /**
     * Check if NOT in specific state
     */
    isNot(state: ConversationState): boolean {
        return this.currentState !== state;
    }

    /**
     * Transition to new state
     */
    transition(newState: ConversationState): void {
        if (this.currentState === newState) {
            return; // No change
        }

        const prevState = this.currentState;
        this.currentState = newState;

        // Update history
        this.stateHistory.push(newState);
        if (this.stateHistory.length > this.MAX_HISTORY) {
            this.stateHistory.shift();
        }

        // Log transition
        console.log(`[StateMachine] ${prevState} → ${newState}`);

        // Notify listeners
        this.notifyListeners(newState, prevState);
    }

    /**
     * Start listening (user can speak)
     */
    startListening(): void {
        this.transition(ConversationState.LISTENING);
    }

    /**
     * Start thinking (waiting for AI)
     */
    startThinking(): void {
        this.transition(ConversationState.THINKING);
    }

    /**
     * Start speaking (AI is speaking)
     */
    startSpeaking(): void {
        this.transition(ConversationState.SPEAKING);
    }

    /**
     * Handle interrupt
     */
    interrupt(): void {
        if (this.is(ConversationState.SPEAKING)) {
            this.transition(ConversationState.INTERRUPTED);
            // Quickly return to listening
            setTimeout(() => {
                this.transition(ConversationState.LISTENING);
            }, 100);
        }
    }

    /**
     * Stop conversation
     */
    stop(): void {
        this.transition(ConversationState.IDLE);
    }

    /**
     * Add state change listener
     */
    addListener(listener: StateChangeListener): void {
        this.listeners.push(listener);
    }

    /**
     * Remove state change listener
     */
    removeListener(listener: StateChangeListener): void {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * Get state history
     */
    getHistory(): ConversationState[] {
        return [...this.stateHistory];
    }

    /**
     * Get previous state
     */
    getPreviousState(): ConversationState | null {
        return this.stateHistory.length >= 2
            ? this.stateHistory[this.stateHistory.length - 2]
            : null;
    }

    private notifyListeners(newState: ConversationState, prevState: ConversationState): void {
        this.listeners.forEach(listener => {
            try {
                listener(newState, prevState);
            } catch (error) {
                console.error('[StateMachine] Listener error:', error);
            }
        });
    }

    /**
     * Get state as emoji for display
     */
    getStateEmoji(): string {
        switch (this.currentState) {
            case ConversationState.IDLE:
                return '⏸️';
            case ConversationState.LISTENING:
                return '👂';
            case ConversationState.THINKING:
                return '🤔';
            case ConversationState.SPEAKING:
                return '🗣️';
            case ConversationState.INTERRUPTED:
                return '🛑';
            default:
                return '❓';
        }
    }

    /**
     * Get state as color for UI
     */
    getStateColor(): string {
        switch (this.currentState) {
            case ConversationState.IDLE:
                return '#gray';
            case ConversationState.LISTENING:
                return '#22c55e'; // green
            case ConversationState.THINKING:
                return '#eab308'; // yellow
            case ConversationState.SPEAKING:
                return '#3b82f6'; // blue
            case ConversationState.INTERRUPTED:
                return '#ef4444'; // red
            default:
                return '#gray';
        }
    }
}
