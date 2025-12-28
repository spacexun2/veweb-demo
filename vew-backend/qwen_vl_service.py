"""
Qwen-VL-Max Visual Understanding Service (ModelScope API)
Replaces YOLOv8 with intelligent multi-modal understanding
"""

import os
import requests
import base64
import json
from typing import Dict, List, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ModelScope API configuration
MODELSCOPE_API_KEY = os.getenv("MODELSCOPE_API_KEY", "ms-ee782298-b1a0-4a42-9efe-2d53a4095893")
MODELSCOPE_API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"


class QwenVLService:
    """
    Qwen-VL-Max 视觉理解服务
    
    功能:
    - 理解屏幕内容（界面、代码、文档）
    - 检测用户操作和行为
    - 生成场景描述
    - 识别关键元素
    
    替代 YOLOv8 实现更智能的视觉理解
    """
    
    def __init__(self, model: str = "qwen-vl-max"):
        """
        初始化视觉理解服务
        
        Args:
            model: 模型名称 (qwen-vl-max, qwen-vl-plus)
        """
        self.model = model
        self.api_key = MODELSCOPE_API_KEY
        self.api_url = MODELSCOPE_API_URL
    
    def encode_image_base64(self, image_path: str) -> str:
        """将图片编码为base64"""
        with open(image_path, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')
    
    def analyze_frame(
        self,
        image_path: str = None,
        image_base64: str = None,
        prompt: str = "描述这个屏幕画面中正在进行什么操作，识别关键元素和用户行为。"
    ) -> Optional[Dict]:
        """
        分析单帧画面
        
        Args:
            image_path: 图片文件路径
            image_base64: Base64编码的图片（二选一）
            prompt: 分析提示词
            
        Returns:
            分析结果字典
        """
        try:
            # Prepare image
            if image_path:
                image_b64 = self.encode_image_base64(image_path)
            elif image_base64:
                image_b64 = image_base64
            else:
                raise ValueError("Must provide either image_path or image_base64")
            
            # Construct request
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": self.model,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_b64}"
                                }
                            },
                            {
                                "type": "text",
                                "text": prompt
                            }
                        ]
                    }
                ],
                "temperature": 0.7,
                "max_tokens": 500
            }
            
            # Make API call
            response = requests.post(
                self.api_url,
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # Extract response
                if 'choices' in result and len(result['choices']) > 0:
                    content = result['choices'][0]['message']['content']
                    
                    return {
                        'description': content,
                        'model': self.model,
                        'timestamp': None  # Set by caller
                    }
                else:
                    print(f"[VL] Unexpected response format: {result}")
                    return None
            else:
                print(f"[VL] Error {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            print(f"[VL] Exception: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def analyze_screen_activity(
        self,
        image_path: str = None,
        image_base64: str = None
    ) -> Optional[Dict]:
        """
        分析屏幕活动（专用于录屏场景）
        
        返回:
        - activity_type: 活动类型（coding, browsing, presenting等）
        - elements: 识别的界面元素
        - actions: 检测到的操作
        """
        prompt = """分析这个屏幕截图，回答以下问题：
1. 用户正在进行什么活动？（编程、浏览网页、演示、写文档等）
2. 屏幕中有哪些关键界面元素？（按钮、输入框、代码编辑器等）
3. 检测到哪些用户操作？（点击、输入、滚动等）

请用JSON格式回复：
{
  "activity_type": "活动类型",
  "elements": ["元素1", "元素2"],
  "actions": ["操作1", "操作2"],
  "description": "简短描述"
}"""
        
        result = self.analyze_frame(
            image_path=image_path,
            image_base64=image_base64,
            prompt=prompt
        )
        
        if result:
            try:
                # Try to parse JSON response
                content = result['description']
                
                # Extract JSON if embedded in text
                import re
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    parsed = json.loads(json_match.group())
                    return {
                        **parsed,
                        'raw_description': content,
                        'model': self.model
                    }
                else:
                    # Fallback to plain text
                    return {
                        'activity_type': 'unknown',
                        'elements': [],
                        'actions': [],
                        'description': content,
                        'model': self.model
                    }
            except:
                return result
        
        return None
    
    def detect_scene_change(
        self,
        prev_image_path: str,
        curr_image_path: str
    ) -> bool:
        """
        检测场景是否发生重大变化
        （用于优化关键帧采样）
        
        Returns:
            True if significant change detected
        """
        prompt = "对比这两张图片，场景是否发生了重大变化？只回答'是'或'否'。"
        
        # Note: Qwen-VL-Max supports multi-image comparison
        # For now, use simple description comparison
        
        result1 = self.analyze_frame(prev_image_path, prompt="简述画面内容")
        result2 = self.analyze_frame(curr_image_path, prompt="简述画面内容")
        
        if result1 and result2:
            desc1 = result1['description']
            desc2 = result2['description']
            
            # Simple heuristic: if descriptions differ significantly
            from difflib import SequenceMatcher
            similarity = SequenceMatcher(None, desc1, desc2).ratio()
            
            return similarity < 0.7  # < 70% similar = scene changed
        
        return False


# Test
if __name__ == "__main__":
    import sys
    
    print("=" * 60)
    print("测试 Qwen-VL-Max 视觉理解服务")
    print("=" * 60)
    
    if len(sys.argv) < 2:
        print("\n用法: python qwen_vl_service.py <image_file>")
        print("示例: python qwen_vl_service.py screenshot.png")
        sys.exit(1)
    
    image_file = sys.argv[1]
    
    if not os.path.exists(image_file):
        print(f"✗ 文件不存在: {image_file}")
        sys.exit(1)
    
    vl = QwenVLService(model="qwen-vl-max")
    
    # Test basic analysis
    print(f"\n分析图片: {image_file}")
    result = vl.analyze_frame(image_file)
    
    if result:
        print(f"\n✓ 分析成功!")
        print(f"  描述: {result['description']}")
        print(f"  模型: {result['model']}")
    else:
        print("\n✗ 分析失败")
        sys.exit(1)
    
    # Test activity analysis
    print(f"\n分析屏幕活动...")
    activity = vl.analyze_screen_activity(image_file)
    
    if activity:
        print(f"\n✓ 活动分析:")
        print(f"  类型: {activity.get('activity_type', 'N/A')}")
        print(f"  元素: {activity.get('elements', [])}")
        print(f"  操作: {activity.get('actions', [])}")
        print(f"  描述: {activity.get('description', 'N/A')[:100]}...")
    else:
        print("\n✗ 活动分析失败")
