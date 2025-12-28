"""
OSS + Paraformer - WORKING VERSION
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv()

class ParaformerASRService:
    def __init__(self):
        self.api_key = os.getenv("DASHSCOPE_CHAT_API_KEY")
        self.oss_access_key_id = os.getenv("OSS_ACCESS_KEY_ID")
        self.oss_access_key_secret = os.getenv("OSS_ACCESS_KEY_SECRET")
        self.oss_bucket_name = os.getenv("OSS_BUCKET_NAME")
        self.oss_endpoint = os.getenv("OSS_ENDPOINT", "oss-cn-beijing.aliyuncs.com")
    
    def upload_to_oss(self, local_file_path):
        try:
            import oss2
            auth = oss2.Auth(self.oss_access_key_id, self.oss_access_key_secret)
            bucket = oss2.Bucket(auth, self.oss_endpoint, self.oss_bucket_name)
            
            import time
            filename = os.path.basename(local_file_path)
            object_name = f"videos/{int(time.time())}_{filename}"
            
            print(f"[OSS] Uploading...", file=sys.stderr)
            
            with open(local_file_path, 'rb') as f:
                bucket.put_object(object_name, f)
            
            oss_url = f"https://{self.oss_bucket_name}.{self.oss_endpoint}/{object_name}"
            print(f"[OSS] ✓ Uploaded", file=sys.stderr)
            return oss_url
        except Exception as e:
            print(f"[OSS] Error: {e}", file=sys.stderr)
            return None
    
    def transcribe_file(self, audio_file_path, language="zh", enable_words=True):
        try:
            print(f"[ASR] Processing: {os.path.basename(audio_file_path)}", file=sys.stderr)
            
            oss_url = self.upload_to_oss(audio_file_path)
            if not oss_url:
                return None
            
            from dashscope.audio.asr import Transcription
            import dashscope
            dashscope.api_key = self.api_key
            
            task = Transcription.async_call(
                model='paraformer-v2',
                file_urls=[oss_url],
                language_hints=[language]
            )
            
            print(f"[ASR] Task submitted", file=sys.stderr)
            result = Transcription.wait(task=task.output.task_id)
            
            if result.output.task_status != 'SUCCEEDED':
                print(f"[ASR] Task failed", file=sys.stderr)
                return None
            
            # Extract using DICT access (results are dicts!)
            text = ""
            import requests
            
            for item in result.output.results:
                # CRITICAL: Use dict syntax, not hasattr!
                url = item.get('transcription_url')
                if url:
                    print(f"[ASR] Fetching result...", file=sys.stderr)
                    resp = requests.get(url, timeout=30)
                    
                    if resp.status_code == 200:
                        data = resp.json()
                        for transcript in data.get('transcripts', []):
                            for sentence in transcript.get('sentences', []):
                                text += sentence.get('text', '') + " "
            
            text = text.strip()
            print(f"[ASR] ✓ Got {len(text)} chars", file=sys.stderr)
            
            return {
                'text': text if text else "[No speech detected]",
                'timestamps': [],
                'language': language,
                'duration': 0
            }
                
        except Exception as e:
            print(f"[ASR] Exception: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            return None
