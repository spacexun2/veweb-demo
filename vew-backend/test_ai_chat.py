"""Minimal AI chat test - no screen context, no TTS, just user → AI"""
import asyncio
import json
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import os
import requests

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws/test/{session_id}")
async def test_chat(websocket: WebSocket, session_id: str):
    await websocket.accept()
    print(f"[TEST] Connected: {session_id}")
    
    try:
        while True:
            data = await websocket.receive_json()
            print(f"[TEST] Received: {data}")
            
            if data.get("type") == "user_message":
                user_msg = data.get("message", "")
                print(f"[TEST] User message: {user_msg}")
                
                # Call API directly
                api_key = "sk-f6ef0cf1e33146cd8ab6b85fc574e070"
                url = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "qwen-plus",
                    "messages": [{"role": "user", "content": user_msg}],
                    "temperature": 0.7,
                    "max_tokens": 100
                }
                
                print("[TEST] Calling API...")
                response = requests.post(url, json=payload, headers=headers, timeout=30)
                print(f"[TEST] API Status: {response.status_code}")
                
                if response.status_code == 200:
                    result = response.json()
                    ai_response = result['choices'][0]['message']['content']
                    print(f"[TEST] AI Response: {ai_response[:50]}")
                    
                    await websocket.send_json({
                        "type": "ai_response",
                        "message": ai_response,
                        "timestamp": 0
                    })
                else:
                    print(f"[TEST] API Error: {response.text[:200]}")
                    await websocket.send_json({
                        "type": "ai_response",
                        "message": "API调用失败",
                        "timestamp": 0
                    })
                    
    except Exception as e:
        print(f"[TEST] Error: {e}")

if __name__ == "__main__":
    import uvicorn
    print("Starting test server on http://0.0.0.0:9000")
    uvicorn.run(app, host="0.0.0.0", port=9000)
