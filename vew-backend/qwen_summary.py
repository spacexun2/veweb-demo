#!/usr/bin/env python3
"""
Qwen3-235B Intelligent Summary Generator

Uses ModelScope Qwen3-235B-A22B-Instruct to generate structured summaries
from video transcription text.

Output format:
{
    "tldr": "简短总结",
    "keyPoints": ["关键点1", "关键点2", ...],
    "actionItems": ["待办事项1", "待办事项2", ...]
}
"""

import json
import sys
from typing import List, Dict, Optional
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()


class QwenSummaryGenerator:
    """Qwen3-235B summary generator using ModelScope API"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Qwen3 client
        
        Args:
            api_key: ModelScope API token (defaults to MODELSCOPE_API_KEY env var)
        """
        if api_key is None:
            api_key = os.getenv('MODELSCOPE_API_KEY')
        
        self.client = OpenAI(
            base_url='https://api-inference.modelscope.cn/v1',
            api_key=api_key
        )
        self.model = 'Qwen/Qwen3-235B-A22B-Instruct-2507'
        
    def generate_summary(self, transcription_text: str, vlm_analyses: List[Dict] = None, conversation: List[Dict] = None, language: str = "zh") -> Dict:
        """
        Generate structured summary from transcription, screen activity, and AI conversation
        
        Args:
            transcription_text: Full transcription text
            vlm_analyses: List of VLM screen analyses with timestamp and description
            conversation: List of AI conversation messages with role, content, timestamp
            language: Language code (zh/en)
            
        Returns:
            Dict with tldr, keyPoints, actionItems
        """
        
        # Build AI conversation summary if available
        ai_dialogue = ""
        if conversation and len(conversation) > 0:
            if language == "zh":
                ai_dialogue = "\n\n【AI对话记录】\n" + "\n".join([
                    f"{msg['role'].upper()}: {msg['content']}"
                    for msg in conversation
                ])
            else:
                ai_dialogue = "\n\n[AI Conversation]\n" + "\n".join([
                    f"{msg['role'].upper()}: {msg['content']}"
                    for msg in conversation
                ])
        
        # Build screen activity summary if available
        screen_activity = ""
        if vlm_analyses and len(vlm_analyses) > 0:
            if language == "zh":
               screen_activity = "\n\n【屏幕活动记录】\n" + "\n".join([
                    f"[{int(a['timestamp'])}秒] {a['description']}"
                    for a in vlm_analyses if a.get('success', True)
                ])
            else:
                screen_activity = "\n\n[Screen Activity Log]\n" + "\n".join([
                    f"[{int(a['timestamp'])}s] {a['description']}"
                    for a in vlm_analyses if a.get('success', True)
                ])
        
        # Build prompt based on language
        if language == "zh":
            system_prompt = """你是一个专业的视频内容分析助手。
你的任务是根据视频转录文本和屏幕活动记录，生成结构化的摘要。

输出格式（严格JSON）：
{
    "tldr": "一句话总结用户做了什么和说了什么（50字以内）",
    "keyPoints": ["关键点1（简洁）", "关键点2", "关键点3"],
    "actionItems": ["待办事项1（如果有）", "待办事项2"]
}

要求：
- tldr必须精炼，突出核心任务和成果
- keyPoints结合语音和屏幕活动，提取3-5个最重要的信息点
- actionItems只在视频包含明确行动建议时才填写，否则为空数组
- 使用简洁的中文表达
- 输出纯JSON，不要添加任何解释文字"""

            user_prompt = f"请分析以下内容并生成摘要：\n\n【语音转录】\n{transcription_text}{screen_activity}"
        else:
            system_prompt = """You are a professional video content analyst.
Your task is to generate structured summaries from video transcriptions and screen activity.

Output format (strict JSON):
{
    "tldr": "One-sentence summary of what user did and said (under 50 words)",
    "keyPoints": ["Key point 1 (concise)", "Key point 2", "Key point 3"],
    "actionItems": ["Action item 1 (if any)", "Action item 2"]
}

Requirements:
- tldr must be concise and highlight core tasks and outcomes
- keyPoints should combine speech and screen activity, extract 3-5 most important points
- actionItems only when video contains explicit action suggestions, otherwise empty array
- Use concise language
- Output pure JSON without any explanatory text"""

            user_prompt = f"Please analyze the following and generate a summary:\n\n[Voice Transcription]\n{transcription_text}{screen_activity}"
        
        try:
            print(f"[Qwen Summary] Generating summary for {len(transcription_text)} chars...", file=sys.stderr)
            
            # Call Qwen3-235B API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': user_prompt}
                ],
                temperature=0.7,
                max_tokens=1000,
                stream=False  # Use non-streaming for easier parsing
            )
            
            # Extract response
            result_text = response.choices[0].message.content.strip()
            
            # Parse JSON response
            # Try to extract JSON if wrapped in markdown code blocks
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0].strip()
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0].strip()
            
            summary_data = json.loads(result_text)
            
            # Validate structure
            if not all(key in summary_data for key in ['tldr', 'keyPoints', 'actionItems']):
                raise ValueError("Missing required fields in summary")
            
            print(f"[Qwen Summary] Generated summary: {summary_data['tldr'][:50]}...", file=sys.stderr)
            
            return summary_data
            
        except json.JSONDecodeError as e:
            print(f"[Qwen Summary] Failed to parse JSON: {e}", file=sys.stderr)
            # Fallback to simple summary
            return self._fallback_summary(transcription_text, language)
            
        except Exception as e:
            print(f"[Qwen Summary] API error: {e}", file=sys.stderr)
            return self._fallback_summary(transcription_text, language)
    
    def _fallback_summary(self, text: str, language: str) -> Dict:
        """Fallback summary when API fails"""
        truncated = text[:200] + "..." if len(text) > 200 else text
        
        if language == "zh":
            return {
                "tldr": truncated,
                "keyPoints": ["内容概要已生成（API调用失败，显示原文）"],
                "actionItems": []
            }
        else:
            return {
                "tldr": truncated,
                "keyPoints": ["Summary generated from transcript (API failed, showing original text)"],
                "actionItems": []
            }


def generate_summary(transcription_segments: List[Dict], vlm_analyses: List[Dict] = None, conversation: List[Dict] = None, language: str = "zh") -> Dict:
    """
    Main entry point for summary generation
    
    Args:
        transcription_segments: List of {"start", "end", "text"} dicts
        vlm_analyses: List of {"timestamp", "description", "success"} dicts from VLM
        conversation: List of {"role", "content", "timestamp"} dicts from AI chat
        language: Language code
        
    Returns:
        Structured summary dict
    """
    # Combine all segments into full text
    full_text = " ".join(seg["text"] for seg in transcription_segments)
    
    # Generate summary with VLM data
    generator = QwenSummaryGenerator()
    return generator.generate_summary(full_text, vlm_analyses or [], conversation, language)


if __name__ == "__main__":
    # Test with sample transcription
    test_segments = [
        {"start": 0.0, "end": 5.0, "text": "测试这个"},
        {"start": 5.0, "end": 10.0, "text": "语音转文字的功能"}
    ]
    
    result = generate_summary(test_segments, language="zh")
    print(json.dumps(result, ensure_ascii=False, indent=2))
