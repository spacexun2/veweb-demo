"""
Qwen3-TTS-Flash Service
High-quality, ultra-fast Chinese TTS using Alibaba Cloud Dashscope
"""

import os
import dashscope
from dotenv import load_dotenv
import base64
from typing import Optional

# Load environment variables
load_dotenv()

# Configure Dashscope
dashscope.base_http_api_url = 'https://dashscope.aliyuncs.com/api/v1'
DASHSCOPE_TTS_API_KEY = os.getenv("DASHSCOPE_TTS_API_KEY", "sk-f6ef0cf1e33146cd8ab6b85fc574e070")


class Qwen3TTSService:
    """
    Qwen3-TTS-Flash Service
    
    支持的音色:
    - Cherry: 元气少女音
    - Bella: 温柔女声
    - Andy: 成熟男声
    - Luna: 知性女声
    """
    
    def __init__(self, voice: str = "Cherry"):
        """
        初始化TTS服务
        
        Args:
            voice: 音色 (Cherry, Bella, Andy, Luna)
        """
        self.voice = voice
        self.api_key = DASHSCOPE_TTS_API_KEY
        dashscope.api_key = self.api_key
    
    def synthesize(self, text: str) -> Optional[bytes]:
        """
        合成语音
        
        Args:
            text: 要合成的文字
            
        Returns:
            音频数据（WAV格式）
        """
        try:
            response = dashscope.MultiModalConversation.call(
                model="qwen3-tts-flash",
                api_key=self.api_key,
                text=text,
                voice=self.voice,
                language_type="Chinese",
                speech_rate=1.2  # 1.2x faster speed
            )
            
            # Check response status
            if response.status_code == 200:
                # Audio is returned in response.output.audio
                if hasattr(response.output, 'audio') and hasattr(response.output.audio, 'url'):
                    audio_url = response.output.audio.url
                    print(f"[TTS] Downloading audio from: {audio_url[:80]}...")
                    
                    # Download audio file
                    import requests
                    audio_response = requests.get(audio_url, timeout=30)
                    if audio_response.status_code == 200:
                        print(f"[TTS] Audio downloaded: {len(audio_response.content)} bytes")
                        return audio_response.content
                    else:
                        print(f"[TTS] Failed to download audio: {audio_response.status_code}")
                        return None
                else:
                    print(f"[TTS] No audio URL in response")
                    return None
            else:
                print(f"[TTS] Error {response.status_code}: {response.message}")
                return None
                
        except Exception as e:
            print(f"[TTS] Exception: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def synthesize_base64(self, text: str) -> Optional[str]:
        """
        合成语音并返回Base64编码
        
        Returns:
            Base64编码的音频数据
        """
        audio_data = self.synthesize(text)
        if audio_data:
            return base64.b64encode(audio_data).decode('utf-8')
        return None


# 测试代码
if __name__ == "__main__":
    print("=" * 60)
    print("测试 Qwen3-TTS-Flash 服务")
    print("=" * 60)
    
    # Test with provided example
    tts = Qwen3TTSService(voice="Cherry")
    
    test_text = "你好，我是AI助手。这是使用Qwen3-TTS-Flash模型生成的语音，音质非常自然流畅。"
    print(f"\n合成文字: {test_text}")
    print(f"音色: Cherry")
    print(f"API Key: {DASHSCOPE_TTS_API_KEY[:20]}...")
    print("\n正在合成...")
    
    audio_base64 = tts.synthesize_base64(test_text)
    
    if audio_base64:
        audio_size = len(audio_base64)
        actual_size = len(base64.b64decode(audio_base64))
        
        print(f"\n✓ TTS合成成功！")
        print(f"  Base64长度: {audio_size:,} 字符")
        print(f"  音频大小: {actual_size // 1024}KB")
        
        # Save to file
        audio_data = base64.b64decode(audio_base64)
        output_file = "test_qwen3_tts.wav"  # WAV format
        with open(output_file, "wb") as f:
            f.write(audio_data)
        print(f"  已保存到: {output_file}")
        print(f"\n播放测试: afplay {output_file}")
        
        # Auto-play on macOS
        import subprocess
        subprocess.run(["afplay", output_file])
        
    else:
        print("\n✗ TTS合成失败")
        exit(1)
