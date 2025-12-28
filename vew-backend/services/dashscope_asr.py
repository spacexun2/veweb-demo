"""
DashScope Real-Time ASR Service
Provides high-quality continuous speech recognition
"""

import os
import json
import asyncio
from typing import Callable, Optional
import dashscope
from dashscope.audio.asr import Recognition
from dotenv import load_dotenv

load_dotenv()

class DashScopeASR:
    """Real-time ASR using DashScope Paraformer"""
    
    def __init__(self):
        self.api_key = os.getenv('DASHSCOPE_CHAT_API_KEY')
        dashscope.api_key = self.api_key
        self.recognition = None
        
    async def recognize_stream(
        self,
        audio_stream,
        on_result: Callable[[dict], None]
    ):
        """
        Recognize audio stream in real-time
        
        Args:
            audio_stream: Async iterator of audio chunks
            on_result: Callback for recognition results
        """
        try:
            print("[ASR] Starting DashScope ASR...")
            
            #Note: DashScope Python SDK might not have async streaming yet
            # This is a placeholder for the structure
            # Actual implementation may need HTTP streaming or WebSocket
            
            recognition = Recognition(
                model='paraformer-realtime-v1',
                format='pcm',
                sample_rate=16000,
                language_hints=['zh', 'en']
            )
            
            async for audio_chunk in audio_stream:
                # Process audio chunk
                result = recognition.call(audio_chunk)
                
                if result and result.get('output'):
                    output = result['output']
                    text = output.get('text', '')
                    is_final = output.get('is_final', False)
                    
                    on_result({
                        'text': text,
                        'is_final': is_final,
                        'confidence': output.get('confidence', 1.0)
                    })
                    
        except Exception as e:
            print(f"[ASR] Error: {e}")
            raise
    
    def stop(self):
        """Stop recognition"""
        if self.recognition:
            self.recognition.stop()
            self.recognition = None


# Simple HTTP-based fallback (if streaming not available)
def transcribe_audio_file(audio_path: str) -> str:
    """
    Transcribe a complete audio file
    
    Args:
        audio_path: Path to audio file
        
    Returns:
        Transcribed text
    """
    api_key = os.getenv('DASHSCOPE_CHAT_API_KEY')
    
    try:
        from dashscope import Audio
        
        response = Audio.call(
            model='paraformer-v1',
            file_urls=[audio_path],
            language_hints=['zh', 'en']
        )
        
        if response.status_code == 200:
            return response.output.get('text', '')
        else:
            print(f"[ASR] Transcription failed: {response.message}")
            return ""
            
    except Exception as e:
        print(f"[ASR] Transcription error: {e}")
        return ""
