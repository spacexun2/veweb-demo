#!/usr/bin/env python3
"""
Test timeline generation independently
"""

import sys
import json

# Sample transcription data
test_transcription = [
    {"start": 0.0, "end": 5.0, "text": "现在有个问题"},
    {"start": 5.5, "end": 12.0, "text": "点击其他地方的时候这个ai配置菜单应该收回"},
    {"start": 14.0, "end": 20.0, "text": "转录的文字怎么是繁体字换成简体"},
    {"start": 22.0, "end": 30.0, "text": "AI页面当前无法正常交互输入文字颜色是白色导致内容看不见"},
    {"start": 65.0, "end": 75.0, "text": "时间轴可以显示所有的文字吗最好可以点击跳转到对应的视频时间点"},
]

print("Testing timeline generation...", file=sys.stderr)

import requests

chunks = []
current_chunk = []
current_start = 0
chunk_duration = 60

for seg in test_transcription:
    if seg['start'] - current_start > chunk_duration and current_chunk:
        chunks.append({
            'start': current_start,
            'text': ' '.join([s['text'] for s in current_chunk])
        })
        current_chunk = [seg]
        current_start = seg['start']
    else:
        current_chunk.append(seg)

if current_chunk:
    chunks.append({
        'start': current_start,
        'text': ' '.join([s['text'] for s in current_chunk])
    })

print(f"Created {len(chunks)} chunks", file=sys.stderr)

timeline = []
for i, chunk in enumerate(chunks):
    print(f"\nChunk {i+1}: {chunk['start']:.0f}s", file=sys.stderr)
    print(f"Text: {chunk['text'][:100]}...", file=sys.stderr)
    
    try:
        prompt = f"""简短总结（不超过15字）这段内容的主要事件：
{chunk['text'][:300]}

只返回事件描述，例如："讨论AI配置问题"、"测试输入框功能"
不要其他内容，不要引号。"""

        response = requests.post(
            "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
            headers={
                "Authorization": "Bearer sk-3e8de4df3c9a47b3886e1de9c7906c50",
                "Content-Type": "application/json"
            },
            json={
                "model": "qwen-plus",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.5,
                "max_tokens": 30
            },
            timeout=10
        )
        
        if response.ok:
            result = response.json()
            event_desc = result['choices'][0]['message']['content'].strip()
            event_desc = event_desc.strip('"').strip("'").strip('「').strip('」')
            
            timeline.append({
                "timestamp": chunk['start'],
                "event": event_desc
            })
            print(f"✓ Generated: {event_desc}", file=sys.stderr)
        else:
            print(f"✗ API error: {response.status_code}", file=sys.stderr)
            print(response.text, file=sys.stderr)
    except Exception as e:
        print(f"✗ Exception: {e}", file=sys.stderr)

print("\n" + "="*50, file=sys.stderr)
print(f"Final timeline: {len(timeline)} events", file=sys.stderr)
print(json.dumps(timeline, ensure_ascii=False, indent=2))
