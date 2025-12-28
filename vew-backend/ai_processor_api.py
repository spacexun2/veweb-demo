"""
AI Video Processor using Paraformer API
Generates transcription with timestamps
"""

import sys
import json
import os
from pathlib import Path
from paraformer_asr import ParaformerASRService


def transcribe_video_api(video_path: str, generate_summary: bool = True) -> dict:
    """
    Transcribe video using Paraformer API
    Returns transcription with timestamps, summary, and timeline
    """
    print(f"[API] Transcribing via Paraformer-v2: {video_path}", file=sys.stderr)
    
    asr = ParaformerASRService()
    result = asr.transcribe_file(video_path, language="zh")
    
    if not result:
        return {"error": "Transcription failed"}
    
    # Get full text and duration
    full_text = result.get('text', '')
    duration = result.get('duration', 10)  # Default 10s if unknown
    
    # Generate transcription with timestamps
    transcription = []
    
    if full_text:
        # Split into sentences
        sentences = []
        for sep in ['。', '！', '？', '；']:
            full_text = full_text.replace(sep, sep + '\n')
        
        sentences = [s.strip() for s in full_text.split('\n') if s.strip()]
        
        if sentences:
            # Estimate time per sentence based on character count
            total_chars = sum(len(s) for s in sentences)
            
            current_time = 0
            for sentence in sentences:
                # Estimate duration: ~3 chars per second for Chinese
                sentence_duration = max(1.0, len(sentence) / 3.0)
                
                transcription.append({
                    "start": round(current_time, 2),
                    "end": round(current_time + sentence_duration, 2),
                    "text": sentence
                })
                
                current_time += sentence_duration
        else:
            # Single segment
            transcription.append({
                "start": 0,
                "end": duration,
                "text": full_text
            })
    
    # Generate AI-powered summary
    print("[AI] Generating summary...", file=sys.stderr)
    try:
        from qwen_summary import generate_summary as qwen_generate_summary
        
        # Use AI to generate intelligent summary
        summary_result = qwen_generate_summary(transcription, language="zh")
        
        # qwen_summary returns dict: {tldr, keyPoints, actionItems}
        # Return the full dict for structured summary display
        summary = summary_result
        
        print(f"[AI] ✓ Generated AI summary", file=sys.stderr)
        
    except Exception as e:
        print(f"[AI] Summary generation failed: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        # Fallback to simple text summary
        summary = full_text[:200] + ("..." if len(full_text) > 200 else "") if full_text else "无语音内容"
    
    
    # Generate timeline using timeline_generator
    print("[AI] Generating timeline...", file=sys.stderr)
    timeline = [] # Initialize timeline here to ensure it's always defined
    try:
        import subprocess
        
        # Call timeline_generator.py
        result = subprocess.run(
            ['python3', 'timeline_generator.py'],
            input=json.dumps({'transcription': transcription}),
            capture_output=True,
            text=True,
            timeout=30,
            cwd=os.path.dirname(__file__)
        )
        
        if result.returncode == 0:
            # timeline_generator.py returns list directly, not dict
            timeline = json.loads(result.stdout)
            if not isinstance(timeline, list):
                timeline = []
            print(f"[AI] ✓ Generated {len(timeline)} timeline events", file=sys.stderr)
        else:
            print(f"[AI] Timeline generator failed: {result.stderr[:200]}", file=sys.stderr)
            # Fallback to simple timeline
            timeline = []
            for i, seg in enumerate(transcription[:5]):
                timeline.append({
                    "timestamp": seg['start'],
                    "event": seg['text'][:40] + ("..." if len(seg['text']) > 40 else "")
                })
    except Exception as e:
        print(f"[AI] Timeline generation error: {e}", file=sys.stderr)
        # Fallback to simple timeline
        timeline = []
        for i, seg in enumerate(transcription[:5]):
            timeline.append({
                "timestamp": seg['start'],
                "event": seg['text'][:40] + ("..." if len(seg['text']) > 40 else "")
            })
    
    return {
        "transcription": transcription,
        "summary": summary,
        "timeline": timeline,
        "language": result.get('language', 'zh'),
        "duration": round(current_time, 2) if transcription else 0
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Usage: python ai_processor_api.py <video_path>"
        }))
        sys.exit(1)
    
    video_path = sys.argv[1]
    
    try:
        result = transcribe_video_api(video_path)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "type": type(e).__name__
        }), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
