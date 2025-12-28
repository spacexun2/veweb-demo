"""
Real-time AI Service for Interactive Screen Recording

FastAPI service that:
1. Receives video frames via WebSocket
2. Performs AKS keyframe sampling
3. Runs YOLOv8 action detection
4. Analyzes scenes with Qwen3-VL
5. Triggers proactive AI interactions
6. Manages conversation context
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import base64
import json
import asyncio
from typing import Dict, List, Optional
from datetime import datetime
import time
import os  # For temp file cleanup in VLM analysis

from services.aks_sampler import AdaptiveKeyframeSampler
from qwen_vl_service import QwenVLService  # Replaced YOLOv8
from services.qwen_vlm import QwenVLMAnalyzer  # VLM for screen analysis
from services.trigger_engine import InteractionTrigger, InteractionContext
from qwen_summary import QwenSummaryGenerator
from dotenv import load_dotenv

# Load environment variables
load_dotenv()



app = FastAPI(title="Vew Real-time AI Service")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174", "http://localhost:5184", "http://localhost:5180", "http://localhost:5179", "http://localhost:5187"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RecordingSession:
    """Manages state for a single recording session"""
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.aks_sampler = AdaptiveKeyframeSampler()
        self.visual_analyzer = QwenVLService(model="qwen-vl-max")  # Replaced YOLOv8
        self.vlm_analyzer = QwenVLMAnalyzer()
        self.trigger_engine = InteractionTrigger()
        
        self.start_time = time.time()
        self.keyframes: List[Dict] = []
        self.conversation_history: List[Dict] = []
        self.vlm_history: List[Dict] = []  # Store all VLM analyses for summary
        self.prev_frame = None
        self.idle_time = 0
        self.last_activity_time = time.time()
        self.last_vlm_analysis = None  # Store latest VLM analysis for screen context
        
    def get_current_timestamp(self) -> float:
        """Get current timestamp in session"""
        return time.time() - self.start_time


# Active sessions
sessions: Dict[str, RecordingSession] = {}


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "Vew Real-time AI",
        "timestamp": datetime.now().isoformat()
    }


@app.websocket("/ws/asr/{session_id}")
async def websocket_asr_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time ASR"""
    await websocket.accept()
    print(f"[ASR] WebSocket connected: {session_id}")
    
    try:
        # Note: For simplicity, we'll use Web Speech API on frontend
        # DashScope ASR streaming requires more complex setup
        # This endpoint is prepared for future cloud ASR integration
        
        while True:
            # Receive audio data
            data = await websocket.receive_bytes()
            
            # For now, echo back (placeholder for actual ASR)
            # In production, this would call DashScope ASR API
            await websocket.send_json({
                "type": "result",
                "text": "[ASR Placeholder - Use Web Speech for now]",
                "is_final": False
            })
            
    except WebSocketDisconnect:
        print(f"[ASR] WebSocket disconnected: {session_id}")


@app.websocket("/ws/recording/{session_id}")
async def websocket_recording_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time recording and AI interaction"""
    await websocket.accept()
    print(f"[WebSocket] Connected: {session_id}")
    
    # Create or get session
    if session_id not in sessions:
        sessions[session_id] = RecordingSession(session_id)
    
    session = sessions[session_id]
    
    # Send connection confirmation immediately
    await safe_send(websocket, {
        "type": "connected",
        "session_id": session_id
    })
    print(f"[WebSocket] Sent connection confirmation to {session_id}")
    
    try:
        while True:
            # Receive frame from client
            print(f"[WebSocket] Waiting for message from session {session_id}...")
            data = await websocket.receive_json()
            print(f"[WebSocket] Received: type='{data.get('type', 'NONE')}', keys={list(data.keys())}")
            
            if data.get("type") == "frame":
                await process_frame(websocket, session, data)
            
            elif data.get("type") == "user_message":
                print(f"[WebSocket] *** USER_MESSAGE RECEIVED ***")
                print(f"[WebSocket] Message: {data.get('message', 'NO MESSAGE')[:100]}")
                await handle_user_message(websocket, session, data)
                print(f"[WebSocket] handle_user_message completed")
            
            elif data.get("type") == "ping":
                # Respond to heartbeat
                await safe_send(websocket, {"type": "pong"})
            
            elif data.get("type") == "end_session":
                await end_session(websocket, session)
                break
    
    except WebSocketDisconnect:
        print(f"[WebSocket] Session {session_id} disconnected")
        # Clean up session after some time
        await asyncio.sleep(300)  # 5 minutes
        if session_id in sessions:
            del sessions[session_id]
    
    except Exception as e:
        print(f"[WebSocket] Error in session {session_id}: {e}")
        await safe_send(websocket, {
            "type": "error",
            "message": str(e)
        })


async def safe_send(websocket: WebSocket, message: dict) -> bool:
    """Safely send WebSocket message, handling closed connections"""
    try:
        await websocket.send_json(message)
        return True
    except RuntimeError as e:
        if "close message has been sent" in str(e):
            print(f"[WebSocket] Connection already closed, skipping send")
            return False
        raise
    except Exception as e:
        print(f"[WebSocket] Send error: {e}")
        return False


async def analyze_vlm_async(session: RecordingSession, frame, timestamp: float):
    """
    Async VLM analysis - runs in background, writes to context pool
    Does NOT block main processing flow
    """
    try:
        print(f"[VLM Background] Starting analysis for t={timestamp:.2f}s")
        
        # Validate frame
        if frame is None or frame.size == 0:
            print(f"[VLM Background] Frame is empty, skipping")
            return
        
        # Save frame temporarily
        import tempfile
        temp_fd, temp_path = tempfile.mkstemp(suffix='.jpg')
        os.close(temp_fd)
        
        # Write frame
        success = cv2.imwrite(temp_path, frame)
        if not success:
            print(f"[VLM Background] Failed to save frame")
            return
        
        # Analyze with VLM (this may take time, but won't block main thread)
        vlm_analysis = session.vlm_analyzer.analyze_frame(
            temp_path,
            context="观察用户屏幕，理解用户正在做什么。如果用户遇到困难或停顿，准备提供帮助。",
            language="zh"
        )
        
        # Clean up temp file
        try:
            os.remove(temp_path)
        except:
            pass
        
        # Update context pool (VLM history)
        session.vlm_history.append({
            'timestamp': timestamp,
            'description': vlm_analysis.get('scene_description', ''),
            'success': vlm_analysis.get('success', True)
        })
        
        # Update latest VLM result for AI to read
        session.last_vlm_analysis = {
            'description': vlm_analysis.get('scene_description', ''),
            'timestamp': timestamp
        }
        
        print(f"[VLM Background] ✓ Complete: {vlm_analysis.get('scene_description', 'N/A')[:80]}...")
        print(f"[VLM Context Pool] Now has {len(session.vlm_history)} analyses")
        
    except Exception as e:
        print(f"[VLM Background] Error: {e}")
        import traceback
        traceback.print_exc()


async def process_frame(websocket: WebSocket, session: RecordingSession, data: Dict):
    """Process incoming video frame"""
    
    try:
        # Decode frame from base64
        frame_data_str = data["data"]
        print(f"[Frame Debug] Received frame data length: {len(frame_data_str) if frame_data_str else 0}")
        
        # Remove data URL prefix if present
        if "," in frame_data_str:
            frame_data_str = frame_data_str.split(",")[1]
            print(f"[Frame Debug] After removing data URL prefix: {len(frame_data_str)}")
        
        frame_data = base64.b64decode(frame_data_str)
        print(f"[Frame Debug] Decoded base64, bytes length: {len(frame_data)}")
        
        nparr = np.frombuffer(frame_data, np.uint8)
        print(f"[Frame Debug] NumPy array shape: {nparr.shape}, dtype: {nparr.dtype}")
        
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        print(f"[Frame Debug] cv2.imdecode result: {frame.shape if frame is not None else 'None'}")
        
        # Validate frame was decoded successfully
        if frame is None:
            print(f"[Error] Frame decode failed - cv2.imdecode returned None")
            print(f"[Error] Input array first 50 bytes: {nparr[:50] if len(nparr) > 0 else 'empty'}")
            return
        
        timestamp = data.get("timestamp", session.get_current_timestamp())
        
        # 1. Check if should sample keyframe (AKS)
        # Handle first frame (prev_frame is None)
        if session.prev_frame is None:
            should_sample = True
            aks_metadata = {'activity': 'high'}  # First frame always high activity
        else:
            should_sample, aks_metadata = session.aks_sampler.should_sample_frame(frame, timestamp)
        
        if not should_sample:
            # Just update idle time
            current_time = time.time()
            time_since_activity = current_time - session.last_activity_time
            session.idle_time = time_since_activity
            return
        
        # 2. This is a keyframe - perform full analysis
        print(f"[AKS] Keyframe at t={timestamp:.2f}s, activity={aks_metadata['activity']}")
        
        # 3. Action detection with YOLOv8
        # action_analysis = session.visual_analyzer  # TODO: Update to use Qwen-VL API(frame, session.prev_frame)
        
        # Fallback action_analysis (TODO was removed but variable still used)
        action_analysis = {
            'actions': {'click': False, 'typing': False},
            'summary': 'Screen activity'
        }
        
        # Update activity time if significant actions detected
        if action_analysis['actions']['click'] or action_analysis['actions']['typing']:
            session.last_activity_time = time.time()
            session.idle_time = 0
        
        # 4. VLM analysis on important keyframes for intelligent interaction
        vlm_analysis = None
        should_use_vlm = (
            len(session.keyframes) == 0 or  # FIRST FRAME - immediate analysis
            aks_metadata['activity'] in ['high', 'medium'] or  # High activity
            session.idle_time > 15.0 or  # User paused (increased from 10s)
            len(session.keyframes) % 15 == 0  # Every 15th keyframe (reduced frequency)
        )
        
        if should_use_vlm:
            # Launch VLM analysis in background - don't wait for it!
            asyncio.create_task(analyze_vlm_async(session, frame, timestamp))
        
        # 5. AI proactive triggers DISABLED per user request
        # User doesn't want AI to send messages automatically on long pauses
        # Triggers disabled: long_pause, very_long_pause, etc.
        
        # context = InteractionContext(
        #     current_frame=frame,
        #     prev_frame=session.prev_frame,
        #     timestamp=timestamp,
        #     idle_time=session.idle_time,
        #     vlm_analysis=vlm_analysis,
        #     action_analysis=action_analysis,
        #     conversation_history=session.conversation_history
        # )
        
        # # Use intelligent trigger that considers VLM analysis
        # trigger_result = session.trigger_engine.should_interact(context, language="zh")
        
        # if trigger_result:
        #     # AI wants to speak - use VLM insight to generate meaningful message
        #     ai_message = trigger_result['message']
        #     
        #     # If we have VLM analysis, enhance the message with AI understanding
        #     if vlm_analysis and vlm_analysis.get('scene_description'):
        #         try:
        #             import requests
        #             
        #             # Ask Qwen3 to generate a helpful question based on what user is doing
        #             prompt = f"""基于用户屏幕分析：
        # {vlm_analysis['scene_description']}
        # 
        # 用户已经停留了{session.idle_time:.0f}秒。
        # 
        # 作为AI助手，生成一个简短、有帮助的问题或建议（不超过20字），帮助用户：
        # - 如果用户看起来遇到困难，询问是否需要帮助
        # - 如果用户在学习，询问是否需要总结
        # - 如果用户在编程，询问是否需要解释
        # - 保持自然、友好的语气
        # 
        # 只返回问题本身，不要其他内容。"""
        # 
        #             url = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
        #             headers = {
        #                 "Authorization": "Bearer sk-3e8de4df3c9a47b3886e1de9c7906c50",
        #                 "Content-Type": "application/json"
        #             }
        #             
        #             payload = {
        #                 "model": "qwen-plus",
        #                 "messages": [{"role": "user", "content": prompt}],
        #                 "temperature": 0.7,
        #                 "max_tokens": 50
        #             }
        #             
        #             response = requests.post(url, json=payload, headers=headers, timeout=5)
        #             if response.ok:
        #                 result = response.json()
        #                 ai_message = result['choices'][0]['message']['content'].strip()
        #                 print(f"[AI Generated] {ai_message}")
        #         except Exception as e:
        #             print(f"[AI Generation] Failed: {e}")
        #             # Fall back to default message
        #     
        #     print(f"[Trigger] {trigger_result['name']}: {ai_message}")
        #     
        #     await safe_send(websocket, {
        #         "type": "ai_message",
        #         "trigger": trigger_result['name'],
        #         "message": ai_message,
        #         "priority": trigger_result['priority'],
        #         "timestamp": timestamp
        #     })
        #     
        #     # Add to conversation history
        
        print(f"[Triggers] Disabled - AI will not proactively send messages")
        
        # 6. Send analysis feedback to client
        await safe_send(websocket, {
            "type": "analysis",
            "timestamp": timestamp,
            "keyframe": True,
            "aks_metadata": aks_metadata,
            "actions": {
                "click": bool(action_analysis['actions']['click']),
                "typing": bool(action_analysis['actions']['typing'])
            },
            "summary": action_analysis['summary']
        })
        
        # Store keyframe
        session.keyframes.append({
            "timestamp": timestamp,
            "aks_metadata": aks_metadata,
            "action_analysis": action_analysis
        })
        
        # Update prev frame
        session.prev_frame = frame
        
    except Exception as e:
        print(f"[Error] Frame processing error: {e}")
        import traceback
        traceback.print_exc()
        await safe_send(websocket, {
            "type": "error",
            "message": f"Frame processing error: {str(e)}"
        })




async def compress_conversation_history(messages: List[Dict]) -> str:
    """
    Compress old conversation history into a concise summary
    
    Args:
        messages: List of conversation messages with role and content
        
    Returns:
        Compressed summary string
    """
    if not messages or len(messages) == 0:
        return "（无历史对话）"
    
    # Build conversation text
    conversation_text = "\n".join([
        f"{msg['role']}: {msg['content']}"
        for msg in messages
    ])
    
    try:
        import requests
        import os
        
        api_key = os.getenv('DASHSCOPE_CHAT_API_KEY')
        url = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "qwen-plus",
            "messages": [{
                "role": "user",
                "content": f"""请将以下对话压缩成简洁的背景摘要（150字以内）：

{conversation_text}

摘要要点：
- 保留关键信息和讨论主题
- 记录重要决策和结论
- 保留用户的问题和需求
- 简洁明了，便于AI继续对话"""
            }],
            "temperature": 0.5,
            "max_tokens": 300,
            "stream": False
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        result = response.json()
        
        summary = result['choices'][0]['message']['content'].strip()
        return summary
        
    except Exception as e:
        print(f"[Compression] Failed to compress history: {e}")
        # Fallback: simple truncation
        return conversation_text[:500] + "..."


async def handle_user_message(websocket: WebSocket, session: RecordingSession, data: Dict):
    """Handle user text/voice input during recording"""
    
    user_message = data.get("message", "")
    timestamp = data.get("timestamp", session.get_current_timestamp())
    
    print(f"[User] {user_message}")
    
    # Add to conversation history
    session.conversation_history.append({
        "role": "user",
        "content": user_message,
        "timestamp": timestamp
    })
    
    # Generate AI response using Qwen with screen context
    try:
        import requests
        
        # Build conversation context
        messages = []
        
        # Add screen context if available (safely check for attribute)
        last_vlm = getattr(session, 'last_vlm_analysis', None)
        if last_vlm and last_vlm.get('description'):
            screen_desc = last_vlm['description']
            screen_time = last_vlm.get('timestamp', 0)
            context_msg = f"""[重要] 你配备了实时视觉分析能力，可以看到用户的屏幕！

当前屏幕内容（{screen_time:.1f}秒）：
{screen_desc}

这是通过视觉模型分析用户屏幕得到的。你**能够看到**用户在做什么。
请基于屏幕内容提供帮助，不要说你看不到屏幕。"""
            
            messages.append({
                "role": "system",
                "content": context_msg
            })
            print(f"[AI] ✓ Added SCREEN VISION context")
        else:
            print(f"[AI] No screen vision yet, using conversation only")
        
        
        # Add conversation history with intelligent compression
        # Keep recent messages intact, compress older ones for context
        RECENT_MESSAGES_COUNT = 10  # Keep last 10 messages fully
        
        if len(session.conversation_history) > RECENT_MESSAGES_COUNT:
            # Split into old and recent
            old_history = session.conversation_history[:-RECENT_MESSAGES_COUNT]
            recent_history = session.conversation_history[-RECENT_MESSAGES_COUNT:]
            
            # Compress old history into a context summary
            try:
                old_summary = await compress_conversation_history(old_history)
                messages.append({
                    "role": "system",
                    "content": f"""[对话历史摘要]
{old_summary}

以上是之前的对话摘要。请基于这些背景信息继续对话。"""
                })
                print(f"[AI] Compressed {len(old_history)} old messages into context summary")
            except Exception as e:
                print(f"[AI] History compression failed: {e}, using recent only")
                recent_history = session.conversation_history[-RECENT_MESSAGES_COUNT:]
            
            # Add recent messages in full
            for msg in recent_history:
                messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })
            
            print(f"[AI] Using compressed history ({len(old_history)} compressed) + {len(recent_history)} recent messages")
        else:
            # All history fits, use directly
            for msg in session.conversation_history:
                messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })
            print(f"[AI] Using full history: {len(session.conversation_history)} messages")
        
        # Call Qwen API with proper authentication
        import os
        api_key = os.getenv('DASHSCOPE_CHAT_API_KEY')
        if not api_key:
            print("[Error] DASHSCOPE_CHAT_API_KEY not found in environment!")
            raise ValueError("API key not configured")
        url = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "qwen-plus",
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 500,
            "stream": True,  # 开启流式输出
            "incremental_output": True  # 增量输出
        }
        
        print(f"[AI] Calling Qwen API with {len(messages)} messages (STREAMING)...")
        
        # 使用async httpx替代同步requests以避免阻塞
        import httpx
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream('POST', url, json=payload, headers=headers) as response:
                print(f"[AI] Response status: {response.status_code}")
                response.raise_for_status()
                
                # 处理SSE流式响应
                full_response = ""
                chunk_count = 0
                
                async for line in response.aiter_lines():
                    if line:
                        # SSE格式: data: {json}
                        if line.startswith('data:'):
                            data_str = line[5:].strip()
                            
                            # 跳过[DONE]标记
                            if data_str == '[DONE]':
                                break
                            
                            try:
                                chunk_data = json.loads(data_str)
                                
                                # 提取增量内容
                                if 'choices' in chunk_data and len(chunk_data['choices']) > 0:
                                    delta = chunk_data['choices'][0].get('delta', {})
                                    content = delta.get('content', '')
                                    
                                    if content:
                                        full_response += content
                                        chunk_count += 1
                                        
                                        # 立即发送chunk到前端
                                        await safe_send(websocket, {
                                            "type": "ai_chunk",
                                            "content": content,
                                            "chunk_index": chunk_count,
                                            "timestamp": time.time()
                                        })
                                        
                                        print(f"[AI Chunk {chunk_count}] {content[:50]}...")
                            
                            except json.JSONDecodeError as e:
                                print(f"[Warning] Failed to parse SSE chunk: {e}")
                                continue
        
        # 发送完成信号
        await safe_send(websocket, {
            "type": "ai_complete",
            "full_content": full_response,
            "total_chunks": chunk_count,
            "timestamp": time.time()
        })
        
        ai_response = full_response
        print(f"[AI] Streaming complete: {chunk_count} chunks, {len(ai_response)} chars")
        
    except requests.exceptions.RequestException as e:
        print(f"[Error] API Request failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"[Error] Response text: {e.response.text}")
        ai_response = "抱歉，我现在无法回答。请稍后再试。"
    except KeyError as e:
        print(f"[Error] Response parsing failed: {e}")
        print(f"[Error] Response data: {result if 'result' in locals() else 'N/A'}")
        ai_response = "抱歉，我现在无法回答。请稍后再试。"
    except Exception as e:
        print(f"[Error] Unexpected error: {type(e).__name__}: {e}")
        ai_response = "抱歉，我现在无法回答。请稍后再试。"
    
    # Add AI response to history
    session.conversation_history.append({
        "role": "assistant",
        "content": ai_response,
        "timestamp": timestamp
    })
    
    
    # NOTE: Streaming already sent ai_complete, no need for ai_response
    # Commenting out to prevent duplicate messages in frontend
    # await websocket.send_json({
    #     "type": "ai_response",
    #     "message": ai_response,
    #     "timestamp": timestamp
    # })


async def end_session(websocket: WebSocket, session: RecordingSession):
    """End recording session and generate final summary"""
    
    print(f"[Session] Ending session {session.session_id}")
    
    # Generate summary of session including conversation history
    summary = {
        "session_id": session.session_id,
        "duration": session.get_current_timestamp(),
        "keyframes_count": len(session.keyframes),
        "interactions_count": len([m for m in session.conversation_history if m['role'] == 'assistant']),
        "conversation": session.conversation_history,  # Full conversation history for saving
        "vlm_analyses_count": len(session.vlm_history)  # VLM history count
    }
    
    await safe_send(websocket, {
        "type": "session_ended",
        "summary": summary
    })
    
    print(f"[Session] {session.session_id} ended: {len(session.keyframes)} keyframes, {len(session.conversation_history)} messages, {len(session.vlm_history)} VLM analyses")


if __name__ == "__main__":
    import uvicorn
    
    print("Starting Vew Real-time AI Service...")
    print("WebSocket endpoint: ws://localhost:8000/ws/recording/{session_id}")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
