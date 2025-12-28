"""
Alibaba Cloud TTS Service - HTTP API Version
(Simpler approach without SDK dependency)
"""

import requests
import json
import base64
from typing import Optional

DASHSCOPE_API_KEY = "sk-3e8de4df3c9a47b3886e1de9c7906c50"
TTS_API_URL = "https://dashscope.aliyuncs.com/api/v1/services/audio/tts/synthesis"


class AliyunTTSService:
    """
    阿里云TTS服务 - 使用HTTP API
    
    支持的音色：
    - zhitian_emo: 知甜（女声，甜美，支持情感）
    - zhixiaoxuan: 知晓轩（女声，专业）  
    - zhiyan_emo: 知燕（女声，温柔）
    - kenny: 肯尼（男声，浑厚）
    """
    
    def __init__(self, voice: str = "zhitian_emo"):
        """
        初始化TTS服务
        
        Args:
            voice: 音色名称
        """
        self.voice = voice
        self.api_key = DASHSCOPE_API_KEY
    
    def synthesize(self, text: str, rate: int = 0, pitch: int = 0, volume: int = 50) -> Optional[bytes]:
        """
        合成语音
        
        Args:
            text: 要合成的文字
            rate: 语速 (-500 到 500, 0为正常)
            pitch: 音调 (-500 到 500, 0为正常)
            volume: 音量 (0-100)
            
        Returns:
            音频数据（MP3格式）
        """
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": "sambert-zhichu-v1",
                "input": {
                    "text": text
                },
                "parameters": {
                    "voice": self.voice,
                    "format": "mp3",
                    "sample_rate": 16000,
                    "volume": volume,
                    "speech_rate": rate,
                    "pitch_rate": pitch
                }
            }
            
            response = requests.post(
                TTS_API_URL,
                headers=headers,
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # Check if audio URL is provided
                if 'output' in result and 'audio_url' in result['output']:
                    audio_url = result['output']['audio_url']
                    audio_response = requests.get(audio_url, timeout=10)
                    if audio_response.status_code == 200:
                        return audio_response.content
                
                # Or check if audio data is embedded
                elif 'output' in result and 'audio' in result['output']:
                    audio_b64 = result['output']['audio']
                    return base64.b64decode(audio_b64)
                
                print(f"[TTS] Unexpected response format: {result}")
                return None
            else:
                print(f"[TTS] Error {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            print(f"[TTS] Exception: {e}")
            return None
    
    def synthesize_base64(self, text: str, rate: int = 0, pitch: int = 0, volume: int = 50) -> Optional[str]:
        """
        合成语音并返回Base64编码
        
        Returns:
            Base64编码的音频数据
        """
        audio_data = self.synthesize(text, rate, pitch, volume)
        if audio_data:
            return base64.b64encode(audio_data).decode('utf-8')
        return None


# 测试
if __name__ == "__main__":
    import sys
    
    print("测试阿里云TTS服务...")
    tts = AliyunTTSService(voice="zhitian_emo")
    
    test_text = "你好，我是AI助手，很高兴为您服务。这是一个语音测试。"
    print(f"合成文字: {test_text}")
    
    audio_base64 = tts.synthesize_base64(test_text, volume=80)
    
    if audio_base64:
        audio_size = len(audio_base64)
        print(f"✓ TTS成功！")
        print(f"  Base64长度: {audio_size} 字符")
        print(f"  音频大小: ~{len(base64.b64decode(audio_base64)) // 1024}KB")
        
        # Save to file
        audio_data = base64.b64decode(audio_base64)
        with open("test_tts.mp3", "wb") as f:
            f.write(audio_data)
        print(f"  已保存到: test_tts.mp3")
        print(f"\n播放测试音频: afplay test_tts.mp3")
    else:
        print("✗ TTS失败")
        sys.exit(1)
