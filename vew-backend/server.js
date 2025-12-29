import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import {
    getAllVideos,
    getVideoById,
    addVideo,
    updateVideo,
    deleteVideo,
    deleteVideos
} from './services/storage.js';
import { batchProcess, generateSRT } from './services/processor.js';
import { demoLogin, demoAuthMiddleware, requireAuth, DEMO_ACCOUNTS } from './demo-auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Static file serving for uploaded videos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadsDir = path.join(__dirname, 'uploads');
        try {
            await fs.mkdir(uploadsDir, { recursive: true });
        } catch (error) {
            console.error('Error creating uploads directory:', error);
        }
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `video-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB max
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /webm|mp4|mov|avi|mkv/;
        const ext = path.extname(file.originalname).toLowerCase().slice(1);

        if (allowedTypes.test(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only video files are allowed.'));
        }
    }
});

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Vew Backend Server is running',
        timestamp: new Date().toISOString()
    });
});

// Simple ping endpoint for debugging
app.get('/api/ping', (req, res) => {
    res.json({ message: 'pong', timestamp: new Date().toISOString() });
});


// ==================== DEMO AUTH ROUTES ====================

// Demo login
app.post('/api/demo-login', (req, res) => {
    try {
        const { email, password } = req.body;
        const result = demoLogin(email, password);
        res.json(result);
    } catch (error) {
        console.error('Demo login error:', error);
        res.status(401).json({ error: error.message });
    }
});

// Get demo accounts info (for testing)
app.get('/api/demo-accounts', (req, res) => {
    res.json(DEMO_ACCOUNTS);
});

// Get all videos (with demo auth)
app.get('/api/videos', demoAuthMiddleware, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const videos = await getAllVideos(userId);
        console.log(`📋 GET /api/videos - Returning ${videos.length} videos`);
        res.json({ videos });
    } catch (error) {
        console.error('Error getting videos:', error);
        res.status(500).json({ error: 'Failed to retrieve videos' });
    }
});

// Get single video
app.get('/api/video/:id', async (req, res) => {
    try {
        const video = await getVideoById(req.params.id);

        if (!video) {
            return res.status(404).json({ error: 'Video not found' });
        }

        console.log(`📹 GET /api/video/${req.params.id}`);
        res.json(video);
    } catch (error) {
        console.error('Error getting video:', error);
        res.status(500).json({ error: 'Failed to retrieve video' });
    }
});

// Upload video (with demo auth)
app.post('/api/upload', demoAuthMiddleware, upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No video file uploaded' });
        }

        const videoId = uuidv4();
        const userId = req.user?.userId; // Get from auth middleware

        // Parse conversation history if provided
        let conversation = [];
        try {
            if (req.body.conversation) {
                conversation = JSON.parse(req.body.conversation);
                console.log(`📝 Received conversation with ${conversation.length} messages`);
            }
        } catch (e) {
            console.warn('Failed to parse conversation:', e);
        }

        const newVideo = {
            id: videoId,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            duration: 0, // Could be extracted with ffmpeg in production
            uploadedAt: new Date().toISOString(),
            status: 'pending',
            processing: null,
            transcriptReady: false,
            conversation: conversation  // Store AI conversation history
        };

        await addVideo(newVideo, userId); // Pass userId for ownership

        console.log(`📤 POST /api/upload - Video uploaded: ${videoId} by user ${userId}`);
        res.json({
            success: true,
            videoId: videoId,
            filename: req.file.filename
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload video' });
    }
});

// Batch process videos
app.post('/api/videos/batch-process', async (req, res) => {
    try {
        const { videoIds } = req.body;

        if (!Array.isArray(videoIds) || videoIds.length === 0) {
            return res.status(400).json({ error: 'Invalid video IDs' });
        }

        console.log(`⚙️ POST /api/videos/batch-process - Processing ${videoIds.length} videos`);

        // Get video file paths
        const videos = await getAllVideos();
        const videoPaths = videoIds.map(id => {
            const video = videos.find(v => v.id === id);
            if (!video) {
                throw new Error(`Video not found: ${id}`);
            }
            return path.join(__dirname, 'uploads', video.filename);
        });

        console.log(`📁 Video paths:`, videoPaths);

        const result = await batchProcess(videoIds, videoPaths);
        res.json(result);
    } catch (error) {
        console.error('Batch process error:', error);
        res.status(500).json({ error: 'Failed to process videos' });
    }
});

// Batch delete videos
app.post('/api/videos/batch-delete', async (req, res) => {
    try {
        const { videoIds } = req.body;

        if (!Array.isArray(videoIds) || videoIds.length === 0) {
            return res.status(400).json({ error: 'Invalid video IDs' });
        }

        console.log(`🗑️ POST /api/videos/batch-delete - Deleting ${videoIds.length} videos`);

        // Delete files from disk
        const videos = await getAllVideos();
        for (const id of videoIds) {
            const video = videos.find(v => v.id === id);
            if (video) {
                try {
                    await fs.unlink(path.join(__dirname, 'uploads', video.filename));
                } catch (error) {
                    console.error(`Failed to delete file ${video.filename}:`, error);
                }
            }
        }

        // Delete from database
        const deleted = await deleteVideos(videoIds);

        res.json({ success: true, deleted });
    } catch (error) {
        console.error('Batch delete error:', error);
        res.status(500).json({ error: 'Failed to delete videos' });
    }
});

// Batch export SRT
app.post('/api/videos/batch-export-srt', async (req, res) => {
    try {
        const { videoIds } = req.body;

        if (!Array.isArray(videoIds) || videoIds.length === 0) {
            return res.status(400).json({ error: 'Invalid video IDs' });
        }

        console.log(`📦 POST /api/videos/batch-export-srt - Exporting ${videoIds.length} videos`);

        const videos = await getAllVideos();
        let srtContent = '';

        for (const id of videoIds) {
            const video = videos.find(v => v.id === id);
            if (video?.processing?.transcription) {
                srtContent += `\n\n=== ${video.originalName} ===\n\n`;
                srtContent += generateSRT(video.processing.transcription);
            }
        }

        res.setHeader('Content-Type', 'application/x-subrip');
        res.setHeader('Content-Disposition', `attachment; filename="export-${Date.now()}.srt"`);
        res.send(srtContent);
    } catch (error) {
        console.error('Batch export error:', error);
        res.status(500).json({ error: 'Failed to export SRT' });
    }
});


// Regenerate timeline for a video
app.post('/api/videos/:id/regenerate-timeline', async (req, res) => {
    try {
        const videoId = req.params.id;
        const videos = await getAllVideos();
        const video = videos.find(v => v.id === videoId);

        if (!video) {
            return res.status(404).json({ error: 'Video not found' });
        }

        if (!video.processing?.transcription || video.processing.transcription.length === 0) {
            return res.status(400).json({ error: 'No transcription available' });
        }

        console.log(`🔄 POST /api/videos/${videoId}/regenerate-timeline`);

        // Call Python timeline generator
        const { spawn } = await import('child_process');
        const timelineGen = spawn('python3', ['timeline_generator.py'], {
            cwd: __dirname
        });

        // Send transcription as input
        timelineGen.stdin.write(JSON.stringify({
            transcription: video.processing.transcription
        }));
        timelineGen.stdin.end();

        let output = '';
        let errorOut = '';

        timelineGen.stdout.on('data', (data) => {
            output += data.toString();
        });

        timelineGen.stderr.on('data', (data) => {
            errorOut += data.toString();
            console.log(`[Timeline] ${data.toString().trim()}`);
        });

        timelineGen.on('close', async (code) => {
            if (code !== 0) {
                console.error('[Timeline] Generation failed:', errorOut);
                return res.status(500).json({ error: 'Timeline generation failed' });
            }

            try {
                // timeline_generator.py returns array directly, not {timeline: [...]}
                const timeline = JSON.parse(output);

                // ✅ CRITICAL FIX: Save timeline to database!
                await updateVideo(videoId, {
                    processing: {
                        ...video.processing,
                        timeline: timeline
                    }
                });

                console.log(`✅ Timeline saved to database: ${timeline.length} events`);

                res.json({
                    timeline: timeline,
                    count: timeline.length
                });
            } catch (error) {
                console.error('[Timeline] Parse error:', error);
                res.status(500).json({ error: 'Failed to parse timeline result' });
            }
        });

    } catch (error) {
        console.error('[Timeline] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// TTS endpoint - Generate speech from text using Qwen3-TTS
app.post('/api/tts', async (req, res) => {
    try {
        const { text } = req.body;

        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return res.status(400).json({ error: 'No valid text provided' });
        }

        console.log(`[TTS] Generating audio for: "${text.substring(0, 50)}..."`);

        // Call Python TTS service
        const { spawn } = await import('child_process');
        const pythonProcess = spawn('python3', [
            '-c',
            `
import sys
import json
sys.path.insert(0, '${process.cwd()}')
try:
    from qwen3_tts import Qwen3TTSService
    tts = Qwen3TTSService(voice="Cherry")
    text = json.loads(sys.argv[1])
    audio_data = tts.synthesize(text)
    if audio_data:
        sys.stdout.buffer.write(audio_data)
        sys.exit(0)
    else:
        print("No audio data returned", file=sys.stderr)
        sys.exit(1)
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)
`,
            JSON.stringify(text)
        ]);

        let audioData = Buffer.alloc(0);
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            audioData = Buffer.concat([audioData, data]);
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code === 0 && audioData.length > 0) {
                console.log(`[TTS] Success: ${audioData.length} bytes`);
                res.set('Content-Type', 'audio/mpeg');
                res.set('Content-Length', audioData.length);
                res.send(audioData);
            } else {
                console.error(`[TTS] Failed (code ${code}):`, errorOutput);
                res.status(500).json({
                    error: 'TTS generation failed',
                    details: errorOutput.substring(0, 200)
                });
            }
        });

        pythonProcess.on('error', (err) => {
            console.error('[TTS] Process error:', err);
            res.status(500).json({ error: 'Failed to start TTS process' });
        });

    } catch (error) {
        console.error('[TTS] Error:', error);
        res.status(500).json({ error: error.message });
    }
});





// AI Test Endpoint - runs VLM+AI backend test
app.get('/api/test-ai', async (req, res) => {
    try {
        console.log('🧪 Running VLM+AI test...');

        const { spawn } = await import('child_process');
        const pythonProcess = spawn('python3', ['test_vlm_ai_backend.py'], {
            cwd: __dirname,
            env: process.env
        });

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
            console.log(`Test completed with code ${code}`);

            res.json({
                success: code === 0,
                exitCode: code,
                output: stdout,
                error: stderr,
                timestamp: new Date().toISOString()
            });
        });

        // Timeout after 60 seconds
        setTimeout(() => {
            pythonProcess.kill();
            res.json({
                success: false,
                error: 'Test timeout after 60 seconds'
            });
        }, 60000);

    } catch (error) {
        console.error('Test API error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 404 handler - MUST be after all route definitions
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
// Handle OPTIONS preflight for CORS
app.options("/api/chat", (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.sendStatus(204);
});

// AI Chat endpoint (HTTP alternative to WebSocket)
app.post("/api/chat", async (req, res) => {
    // Add CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    const { message, history = [] } = req.body;

    console.log("[API Chat] User message:", message);

    if (!message || !message.trim()) {
        return res.status(400).json({ error: "Message is required" });
    }

    try {
        const messages = [
            ...history.map(h => ({ role: h.role, content: h.content })),
            { role: "user", content: message }
        ];

        const dashscopeKey = process.env.DASHSCOPE_CHAT_API_KEY;
        if (!dashscopeKey) {
            throw new Error("DASHSCOPE_CHAT_API_KEY not configured");
        }

        const response = await fetch(
            "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${dashscopeKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "qwen-plus",
                    input: { messages },
                    parameters: {
                        result_format: "message"
                    }
                })
            }
        );

        if (!response.ok) {
            throw new Error(`Dashscope API error: ${response.status}`);
        }

        const data = await response.json();
        const aiReply = data.output.choices[0].message.content;

        console.log("[API Chat] AI reply:", aiReply.substring(0, 100) + "...");

        res.json({
            reply: aiReply,
            success: true
        });

    } catch (error) {
        console.error("[API Chat] Error:", error.message);
        res.status(500).json({
            error: error.message,
            success: false
        });
    }
});


app.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log('║   🚀 Vew Backend Server Started       ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('');
    console.log(`   📍 Server:    http://localhost:${PORT}`);
    console.log(`   📂 Uploads:   ${path.join(__dirname, 'uploads')}`);
    console.log(`   💾 Database:  ${path.join(__dirname, 'db/videos.json')}`);
    console.log('');
    console.log('📋 Available Endpoints:');
    console.log('   GET    /health');
    console.log('   GET    /api/videos');
    console.log('   GET    /api/video/:id');
    console.log('   POST   /api/upload');
    console.log('   POST   /api/videos/batch-process');
    console.log('   POST   /api/videos/batch-delete');
    console.log('   POST   /api/videos/batch-export-srt');
    console.log('');
    console.log('💡 Ready to accept requests!');
    console.log('');
});

// API Cost Stats Endpoint
app.get('/api/cost-stats', async (req, res) => {
    try {
        // Read cost stats from Python tracker
        const fs = await import('fs/promises');
        const costData = await fs.readFile('api_calls.json', 'utf-8');
        const calls = JSON.parse(costData);

        // Calculate stats
        const PRICING = {
            'paraformer': 0.3 / 3600,
            'qwen_vl': 0.06,
            'qwen_tts': 2.0 / 10000,
            'qwen_plus': 0.4 / 1000000,
            'qwen_235b': 20.0 / 1000000
        };

        let total_calls = 0;
        let total_cost = 0;
        const by_api = {};

        for (const [api, apiCalls] of Object.entries(calls)) {
            if (apiCalls.length > 0) {
                total_calls += apiCalls.length;

                let api_cost = 0;
                for (const call of apiCalls) {
                    // Calculate cost based on API type
                    if (api === 'paraformer') {
                        api_cost += (call.duration || 0) / 3600 * 0.3;
                    } else if (api === 'qwen_vl') {
                        api_cost += 0.06;
                    } else if (api === 'qwen_tts') {
                        api_cost += (call.characters || 0) / 10000 * 2.0;
                    } else if (api === 'qwen_plus' || api === 'qwen_235b') {
                        api_cost += (call.tokens || 0) / 1000000 * PRICING[api];
                    }
                }

                by_api[api] = {
                    calls: apiCalls.length,
                    cost: api_cost
                };

                total_cost += api_cost;
            }
        }

        res.json({
            total_calls,
            total_cost,
            by_api
        });
    } catch (error) {
        // Return empty stats if file doesn't exist
        res.json({
            total_calls: 0,
            total_cost: 0,
            by_api: {}
        });
    }
});


// Rename video endpoint
app.put('/api/videos/:id/rename', async (req, res) => {
    try {
        const { id } = req.params;
        const { newName } = req.body;

        if (!newName || newName.trim() === '') {
            return res.status(400).json({ error: '新名称不能为空' });
        }

        const videos = await getAllVideos();
        const video = videos.find(v => v.id === id);

        if (!video) {
            return res.status(404).json({ error: '视频不存在' });
        }

        // Update video name
        video.originalName = newName.trim();
        await updateVideo(video);

        console.log(`📝 Renamed video ${id} to: ${newName}`);
        res.json({ success: true, video });

    } catch (error) {
        console.error('Rename error:', error);
        res.status(500).json({ error: '重命名失败' });
    }
});

// AI Test Endpoint - runs VLM+AI backend test



// TTS Proxy Endpoint


// Test endpoint to verify Railway deployment
app.get('/api/test-new', (req, res) => {
    res.json({ status: 'NEW CODE DEPLOYED', timestamp: new Date().toISOString() });
});
