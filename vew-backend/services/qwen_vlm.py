"""
Qwen3-VL API Integration

Visual understanding using ModelScope Qwen3-VL for scene analysis.
"""

import base64
import json
import os
from typing import Dict, List, Optional
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()


class QwenVLMAnalyzer:
    """Qwen3-VL visual language model analyzer"""
    
    def __init__(self, api_key: str = None):
        """
        Initialize VLM analyzer
        
        Args:
            api_key: ModelScope API token (defaults to MODELSCOPE_API_KEY env var)
        """
        if api_key is None:
            api_key = os.getenv('MODELSCOPE_API_KEY')
        
        self.client = OpenAI(
            base_url='https://api-inference.modelscope.cn/v1',
            api_key=api_key
        )
        self.model = 'Qwen/Qwen3-VL-8B-Instruct'  # Faster 8B model for real-time analysis
    
    def analyze_frame(
        self,
        frame_path: str,
        context: Optional[str] = None,
        language: str = "zh"
    ) -> Dict:
        """
        Analyze a video frame for visual content
        
        Args:
            frame_path: Path to image file or base64 encoded image URL
            context: Optional context about what to look for
            language: Language for response (zh/en)
            
        Returns:
            Analysis results dict
        """
        
        if language == "zh":
            base_prompt = """分析这个屏幕录制帧，识别：
1. 用户当前在做什么
2. 屏幕上显示的主要内容
3. 是否有错误或问题
4. 用户可能需要什么帮助

简洁描述，控制在50字内。"""
        else:
            base_prompt = """Analyze this screen recording frame and identify:
1. What the user is currently doing
2. Main content displayed on screen
3. Any errors or issues
4. What help the user might need

Be concise, under 50 words."""
        
        if context:
            base_prompt += f"\n\n额外上下文：{context}" if language == "zh" else f"\n\nAdditional context: {context}"
        
        try:
            # Read and encode image as base64 data URL
            with open(frame_path, 'rb') as f:
                image_data = f.read()
            
            image_base64 = base64.b64encode(image_data).decode('utf-8')
            image_url = f"data:image/jpeg;base64,{image_base64}"
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{
                    'role': 'user',
                    'content': [
                        {
                            'type': 'text',
                            'text': base_prompt
                        },
                        {
                            'type': 'image_url',
                            'image_url': {'url': image_url}
                        }
                    ]
                }],
                max_tokens=200,
                temperature=0.7,
                stream=False
            )
            
            content = response.choices[0].message.content.strip()
            
            return {
                'scene_description': content,
                'model': self.model,
                'success': True
            }
            
        except Exception as e:
            return {
                'scene_description': f"分析失败: {str(e)}" if language == "zh" else f"Analysis failed: {str(e)}",
                'success': False,
                'error': str(e)
            }


if __name__ == "__main__":
    # Test VLM analyzer
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python qwen_vlm.py <image_url_or_path>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    analyzer = QwenVLMAnalyzer()
    
    result = analyzer.analyze_frame(image_path)
    print(json.dumps(result, ensure_ascii=False, indent=2))
