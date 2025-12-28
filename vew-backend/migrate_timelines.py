#!/usr/bin/env python3
"""
Timeline Migration Script
Fixes old videos with transcription text as timeline events
Regenerates proper timeline with event summaries
"""

import json
import sys
import subprocess
from pathlib import Path

DB_FILE = Path(__file__).parent / 'db' / 'videos.json'

def load_videos():
    """Load videos from database"""
    with open(DB_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_videos(videos):
    """Save videos to database"""
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(videos, f, ensure_ascii=False, indent=2)

def regenerate_timeline(transcription):
    """Call timeline_generator.py to generate proper timeline"""
    try:
        result = subprocess.run(
            ['python3', 'timeline_generator.py'],
            input=json.dumps({'transcription': transcription}),
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            data = json.loads(result.stdout)
            return data.get('timeline', [])
        else:
            print(f"  ✗ Generator failed: {result.stderr[:100]}", file=sys.stderr)
            return None
    except Exception as e:
        print(f"  ✗ Error: {e}", file=sys.stderr)
        return None

def needs_migration(video):
    """Check if video needs timeline migration"""
    proc = video.get('processing', {})
    trans = proc.get('transcription', [])
    timeline = proc.get('timeline', [])
    
    # Need migration if:
    # 1. Has transcription
    # 2. Has timeline
    # 3. Timeline events are too long (>50 chars = likely full transcription text)
    if not trans or not timeline:
        return False
    
    # Check if timeline events look like transcription (long text)
    for event in timeline:
        event_text = event.get('event', '')
        if len(event_text) > 50:  # Long events are likely transcription text
            return True
    
    return False

def main():
    print("="*70)
    print("Timeline Migration Script")
    print("="*70)
    
    # Load videos
    print("\n📁 Loading videos...")
    videos = load_videos()
    print(f"   Found {len(videos)} videos")
    
    # Find videos needing migration
    to_migrate = [v for v in videos if needs_migration(v)]
    print(f"\n🔍 Found {len(to_migrate)} videos needing migration")
    
    if not to_migrate:
        print("\n✅ All videos already have correct timeline format!")
        return
    
    # Migrate each video
    print("\n🔄 Starting migration...")
    success_count = 0
    
    for i, video in enumerate(to_migrate, 1):
        video_id = video.get('id', 'unknown')
        name = video.get('originalName', 'Unknown')
        
        print(f"\n[{i}/{len(to_migrate)}] {name}")
        print(f"   ID: {video_id}")
        
        transcription = video['processing']['transcription']
        print(f"   Transcription entries: {len(transcription)}")
        
        # Regenerate timeline
        new_timeline = regenerate_timeline(transcription)
        
        if new_timeline:
            # Update video
            video['processing']['timeline'] = new_timeline
            print(f"   ✅ Generated {len(new_timeline)} timeline events")
            success_count += 1
        else:
            print(f"   ✗ Failed to generate timeline")
    
    # Save updated videos
    if success_count > 0:
        print(f"\n💾 Saving changes...")
        save_videos(videos)
        print(f"   ✅ Database updated")
    
    # Summary
    print("\n" + "="*70)
    print("Migration Complete")
    print("="*70)
    print(f"✅ Success: {success_count}/{len(to_migrate)} videos")
    print(f"✗ Failed: {len(to_migrate) - success_count}/{len(to_migrate)} videos")
    
    if success_count > 0:
        print("\n🎉 Timeline migration successful!")
        print("   Refresh your browser to see the changes.")
    
if __name__ == '__main__':
    main()
