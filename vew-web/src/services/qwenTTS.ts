/**
 * Qwen TTS Service - DISABLED
 * 
 * This file is no longer used. All TTS now uses cloud-only service in tts.ts
 * Keeping this file to avoid breaking imports, but all functionality is disabled.
 */

export class QwenTTSService {
    constructor() {
        console.warn('[QwenTTS] This service is deprecated. Use TTSService from tts.ts instead.');
    }

    async speak(text: string): Promise<void> {
        console.warn('[QwenTTS] Deprecated - no-op. Use TTSService instead.');
        // All browser TTS disabled
    }

    stop(): void {
        console.warn('[QwenTTS] Deprecated - no-op. Use TTSService instead.');
        // All browser TTS disabled
    }
}
