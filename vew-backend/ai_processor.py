#!/usr/bin/env python3
"""
Vew AI Processor - Fast Speech-to-Text using faster-whisper

This script transcribes video files using the faster-whisper library,
which is 4-5x faster than the original OpenAI Whisper while maintaining
the same accuracy.

Usage:
    python ai_processor.py <video_file_path>

Output: JSON with transcription, summary, and timeline
"""

import sys
import json
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

try:
    from faster_whisper import WhisperModel
except ImportError:
    print(json.dumps({
        "error": "faster-whisper not installed",
        "fix": "Run: pip install faster-whisper"
    }))
    sys.exit(1)

try:
    from qwen_summary import generate_summary
except ImportError:
    print("Warning: qwen_summary not available, will use simple truncation", file=sys.stderr)
    generate_summary = None


def transcribe_video(video_path: str, model_size: str = "base") -> dict:
    """
    Transcribe video file using faster-whisper
    
    Args:
        video_path: Path to video file
        model_size: Whisper model size (tiny, base, small, medium, large)
    
    Returns:
        dict with transcription, summary, and timeline
    """
    
    if not os.path.exists(video_path):
        return {"error": f"Video file not found: {video_path}"}
    
    print(f"Loading Whisper model: {model_size}...", file=sys.stderr)
    
    # Initialize model
    # device="cpu" works on all machines
    # compute_type="int8" for speed, "float16" for accuracy
    model = WhisperModel(
        model_size,
        device="cpu",
        compute_type="int8",
        download_root=os.path.expanduser("~/.cache/whisper")
    )
    
    print(f"Transcribing: {video_path}...", file=sys.stderr)
    
    # Transcribe with forced simplified Chinese
    # Use language="zh" for simplified Chinese
    segments, info = model.transcribe(
        video_path,
        language="zh",  # Force simplified Chinese
        beam_size=5,
        vad_filter=True,  # Voice activity detection
        vad_parameters=dict(min_silence_duration_ms=500)
    )
    
    print(f"Detected language: {info.language} (probability: {info.language_probability:.2f})", file=sys.stderr)
    
    # Initialize OpenCC for traditional to simplified conversion
    from opencc import OpenCC
    cc = OpenCC('t2s')
    
    # Extract transcription segments
    transcription = []
    full_text = []
    
    for segment in segments:
        # Convert traditional Chinese to simplified
        simplified_text = cc.convert(segment.text.strip())
        
        transcription.append({
            "start": round(segment.start, 2),
            "end": round(segment.end, 2),
            "text": simplified_text
        })
        full_text.append(simplified_text)
    
    # Generate intelligent summary using Qwen3-235B
    if generate_summary and len(transcription) > 0:
        try:
            print("[AI] Generating intelligent summary with Qwen3-235B...", file=sys.stderr)
            summary = generate_summary(transcription, language=info.language)
            print(f"[AI] Summary generated: {summary.get('tldr', '')[:50]}...", file=sys.stderr)
        except Exception as e:
            print(f"[AI] Summary generation failed: {e}, using fallback", file=sys.stderr)
            # Fallback to simple truncation
            combined_text = " ".join(full_text)
            summary = combined_text[:200] + "..." if len(combined_text) > 200 else combined_text
    else:
        # Fallback when qwen_summary not available
        combined_text = " ".join(full_text)
        summary = combined_text[:200] + "..." if len(combined_text) > 200 else combined_text    
    # Generate intelligent timeline using AI (ONE-SHOT approach)
    print("[AI] ========== TIMELINE GENERATION START ==========", file=sys.stderr)
    print(f"[AI] Transcription segments: {len(transcription)}", file=sys.stderr)
    timeline = []
    
    if len(transcription) == 0:
        print("[AI] No transcription data, skipping timeline", file=sys.stderr)
    else:
        try:
            from openai import OpenAI
            import json as json_module
            
            # Use same ModelScope API as summary generation
            api_key = os.getenv('MODELSCOPE_API_KEY')
            client = OpenAI(
                base_url='https://api-inference.modelscope.cn/v1',
                api_key=api_key
            )
            model = 'Qwen/Qwen3-235B-A22B-Instruct-2507'
            
            # Prepare full transcription text with timestamps
            full_text_with_time = ""
            for seg in transcription[:50]:  # Limit to first 50 segments
                full_text_with_time += f"[{seg['start']:.0f}s] {seg['text']}
"
            
            print(f"[AI] Generating timeline for {len(full_text_with_time)} chars", file=sys.stderr)
            
            # One-shot prompt: ask AI to generate all events in one call
            prompt = f"""分析这段视频转录内容，生成时间轴事件列表。

转录内容（带时间戳）：
{full_text_with_time}

请生成JSON格式的时间轴事件列表：
[
  {{"timestamp": 0, "event": "事件描述1"}},
  {{"timestamp": 65, "event": "事件描述2"}},
  ...
]

要求：
- 每60秒左右提取一个关键事件（根据内容变化智能划分）
- 事件描述简洁明了，不超过15字
- 最多10个事件
- 只返回JSON数组，不要其他内容
- 不要markdown代码块标记"""

            print("[AI] Calling ModelScope API for timeline...", file=sys.stderr)
            
            response = client.chat.completions.create(
                model=model,
                messages=[{'role': 'user', 'content': prompt}],
                temperature=0.5,
                max_tokens=500
            )
            
            result_text = response.choices[0].message.content.strip()
            print(f"[AI] Response: {result_text[:200]}...", file=sys.stderr)
            
            # Parse JSON response
            # Handle potential markdown code blocks
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0].strip()
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0].strip()
            
            timeline = json_module.loads(result_text)
            
            # Validate and clean
            if isinstance(timeline, list):
                for event in timeline:
                    if 'event' in event:
                        # Remove quotes from event text
                        event['event'] = event['event'].strip('"').strip("'").strip('「').strip('」')
                
                print(f"[AI] ✓ Generated {len(timeline)} timeline events", file=sys.stderr)
                for evt in timeline:
                    print(f"  - {evt.get('timestamp', 0):.0f}s: {evt.get('event', 'N/A')}", file=sys.stderr)
            else:
                raise ValueError("Response is not a list")
                
        except json_module.JSONDecodeError as e:
            print(f"[AI] ✗ JSON parse error: {e}", file=sys.stderr)
            print(f"[AI] Response was: {result_text[:500]}", file=sys.stderr)
            # Fallback to simple timeline
            timeline = []
            for i in range(0, len(transcription), max(1, len(transcription) // 5)):
                seg = transcription[i]
                timeline.append({
                    "timestamp": seg['start'],
                    "event": seg['text'][:40] + "..."
                })
                if len(timeline) >= 5:
                    break
            print(f"[AI] Using fallback: {len(timeline)} events", file=sys.stderr)
            
        except Exception as e:
            print(f"[AI] ✗ Timeline generation failed: {type(e).__name__}: {str(e)}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            
            # Fallback to first 5 segments
            timeline = []
            for i in range(0, len(transcription), max(1, len(transcription) // 5)):
                seg = transcription[i]
                timeline.append({
                    "timestamp": seg['start'],
                    "event": seg['text'][:40] + "..."
                })
                if len(timeline) >= 5:
                    break
            print(f"[AI] Using fallback: {len(timeline)} events", file=sys.stderr)
    
    print(f"[AI] ========== TIMELINE COMPLETE: {len(timeline)} events ==========", file=sys.stderr)

    result = {
        "transcription": transcription,
        "summary": summary,
        "timeline": timeline,
        "language": info.language,
        "duration": info.duration
    }
    
    print(f"Transcription complete: {len(transcription)} segments", file=sys.stderr)
    
    return result


def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Usage: python ai_processor.py <video_path> [model_size]"
        }))
        sys.exit(1)
    
    video_path = sys.argv[1]
    model_size = sys.argv[2] if len(sys.argv) > 2 else "base"
    
    try:
        result = transcribe_video(video_path, model_size)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "type": type(e).__name__
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
