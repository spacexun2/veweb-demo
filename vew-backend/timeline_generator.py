#!/usr/bin/env python3
"""
Standalone timeline generator - Uses ACTUAL transcription timestamps
"""

import sys
import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

def generate_timeline_from_transcription(transcription):
    """Generate timeline preserving ACTUAL timestamps from transcription"""
    if len(transcription) == 0:
        return []
    
    try:
        api_key = os.getenv('MODELSCOPE_API_KEY')
        client = OpenAI(
            base_url='https://api-inference.modelscope.cn/v1',
            api_key=api_key
        )
        
        # Group into chunks, PRESERVE actual start time
        chunks = []
        current_chunk = []
        chunk_start = 0
        
        for seg in transcription:
            if not current_chunk:
                chunk_start = seg['start']  # Record REAL start time
            
            if seg['start'] - chunk_start > 60 and current_chunk:
                chunks.append({
                    'time': chunk_start,  # ACTUAL time from transcription
                    'text': ' '.join([s['text'] for s in current_chunk])
                })
                current_chunk = [seg]
                chunk_start = seg['start']
            else:
                current_chunk.append(seg)
        
        if current_chunk:
            chunks.append({
                'time': chunk_start,
                'text': ' '.join([s['text'] for s in current_chunk])
            })
        
        print(f"Created {len(chunks)} chunks", file=sys.stderr)
        
        # Ask AI for descriptions ONLY, not timestamps
        timeline = []
        for chunk in chunks[:10]:
            try:
                prompt = f"用不超过15字总结：{chunk['text'][:200]}\n只返回事件描述，不要时间。"
                
                response = client.chat.completions.create(
                    model='Qwen/Qwen3-235B-A22B-Instruct-2507',
                    messages=[{'role': 'user', 'content': prompt}],
                    temperature=0.3,
                    max_tokens=20
                )
                
                desc = response.choices[0].message.content.strip().strip('"').strip("'")
                timeline.append({
                    "timestamp": chunk['time'],  # Use REAL time
                    "event": desc
                })
                print(f"✓ {chunk['time']:.1f}s: {desc}", file=sys.stderr)
            except:
                timeline.append({
                    "timestamp": chunk['time'],
                    "event": chunk['text'][:40] + "..."
                })
        
        return timeline
        
    except Exception as e:
        print(f"Failed: {e}", file=sys.stderr)
        # Simple fallback
        step = max(1, len(transcription) // 5)
        return [{
            "timestamp": transcription[i]['start'],
            "event": transcription[i]['text'][:40] + "..."
        } for i in range(0, min(len(transcription), step * 5), step)]


if __name__ == "__main__":
    data = json.load(sys.stdin if len(sys.argv) == 1 else open(sys.argv[1]))
    timeline = generate_timeline_from_transcription(data.get('transcription', []))
    print(json.dumps(timeline, ensure_ascii=False, indent=2))
