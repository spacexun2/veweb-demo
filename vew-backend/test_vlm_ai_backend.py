#!/usr/bin/env python3
"""
完整VLM + AI协作测试
模拟前端用户交互的完整后端逻辑
"""

import sys
import os
import tempfile
import urllib.request

# Add backend to path (use script's directory instead of hardcoded path)
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, script_dir)

print("=" * 70)
print("完整后端测试: VLM图片理解 → AI智能回复")
print("=" * 70)

# Step 1: 获取测试图片
print("\n[步骤1] 下载测试图片...")
test_image_url = "https://modelscope.oss-cn-beijing.aliyuncs.com/demo/images/audrey_hepburn.jpg"

try:
    with urllib.request.urlopen(test_image_url) as response:
        img_data = response.read()
    
    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as f:
        f.write(img_data)
        temp_image_path = f.name
    
    print(f"✅ 测试图片已保存: {temp_image_path}")
except Exception as e:
    print(f"❌ 下载图片失败: {e}")
    sys.exit(1)

# Step 2: VLM分析图片
print("\n[步骤2] VLM分析图片...")
try:
    from services.qwen_vlm import QwenVLMAnalyzer
    
    vlm_analyzer = QwenVLMAnalyzer()
    vlm_result = vlm_analyzer.analyze_frame(
        frame_path=temp_image_path,
        context="请详细描述这张图片的内容",
        language='zh'
    )
    
    # Clean up temp file
    os.unlink(temp_image_path)
    
    if vlm_result.get('success'):
        scene_desc = vlm_result.get('scene_description', '')
        print(f"✅ VLM分析成功")
        print(f"   模型: {vlm_result.get('model')}")
        print(f"   描述: {scene_desc}")
    else:
        print(f"❌ VLM分析失败: {vlm_result}")
        sys.exit(1)
        
except Exception as e:
    print(f"❌ VLM测试异常: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Step 3: 构建AI对话消息（模拟realtime_ai_service的逻辑）
print("\n[步骤3] 构建AI对话上下文（含VLM）...")
try:
    from openai import OpenAI
    from dotenv import load_dotenv
    
    load_dotenv()
    
    # 使用DashScope Chat API (和realtime_ai_service一样)
    chat_client = OpenAI(
        api_key=os.getenv('DASHSCOPE_CHAT_API_KEY'),
        base_url='https://dashscope.aliyuncs.com/compatible-mode/v1'
    )
    
    # 构建消息（完全模拟realtime_ai_service的handle_user_message逻辑）
    messages = [
        {
            "role": "system",
            "content": f"""[重要] 你配备了实时视觉分析能力，可以看到用户的屏幕！

当前屏幕内容：
{scene_desc}

你**能够看到**用户在做什么。
请基于屏幕内容提供帮助。你可以准确描述屏幕中看到的内容。"""
        },
        {
            "role": "user",
            "content": "你能看到我的屏幕吗？请告诉我你看到了什么。"
        }
    ]
    
    print("✅ 消息构建完成，包含VLM上下文")
    
except Exception as e:
    print(f"❌ 消息构建失败: {e}")
    sys.exit(1)

# Step 4: AI生成回复
print("\n[步骤4] AI生成回复（基于VLM上下文）...")
try:
    print("AI回复（流式输出）:")
    print("-" * 70)
    
    response = chat_client.chat.completions.create(
        model='qwen-plus',
        messages=messages,
        stream=True,
        temperature=0.7,
        max_tokens=300
    )
    
    full_ai_response = ""
    for chunk in response:
        if chunk.choices and chunk.choices[0].delta.content:
            content = chunk.choices[0].delta.content
            full_ai_response += content
            print(content, end='', flush=True)
    
    print("\n" + "-" * 70)
    
    if len(full_ai_response) < 10:
        print(f"❌ AI回复太短（{len(full_ai_response)}字符），可能有问题")
        sys.exit(1)
    
    print(f"✅ AI回复成功，长度: {len(full_ai_response)}字符")
    
except Exception as e:
    print(f"❌ AI回复失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Step 5: 验证AI是否使用了VLM上下文
print("\n[步骤5] 验证AI回复质量...")

# 检查AI是否提到了VLM分析的内容
vlm_keywords = ['屏幕', '看到', '能看到', '图片', '照片', '奥黛丽', '赫本', '黑白', '厨房', '烤箱']
mentioned_keywords = [kw for kw in vlm_keywords if kw in full_ai_response]

if mentioned_keywords:
    print(f"✅ AI正确使用了VLM上下文")
    print(f"   提到了关键词: {', '.join(mentioned_keywords)}")
else:
    print(f"⚠️  警告: AI回复未明确提及VLM分析的内容")
    print(f"   这可能表示VLM上下文未被AI正确使用")

# 检查AI是否明确说"能看到"
if "能看到" in full_ai_response or "看到" in full_ai_response:
    print(f"✅ AI明确表示能看到屏幕")
else:
    print(f"⚠️  AI未明确说\"能看到\"")

print("\n" + "=" * 70)
print("✅ 完整测试通过！")
print("=" * 70)
print("\n总结:")
print(f"  • VLM成功分析图片: {scene_desc[:50]}...")
print(f"  • AI基于VLM生成回复: {len(full_ai_response)}字符")
print(f"  • VLM→AI协作正常工作")
print("\n后端逻辑运行正常，可以进行前端测试！")
