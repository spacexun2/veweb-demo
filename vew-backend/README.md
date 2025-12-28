# Vew Backend Server

A Node.js + Express backend server for the Vew Web application, providing video upload, storage, and AI processing capabilities.

## Features

- ✅ **Video Upload** - Supports WebM, MP4, MOV, AVI, MKV (up to 500MB)
- ✅ **File Storage** - Local filesystem-based storage
- ✅ **Metadata Management** - JSON-based database for video metadata
- ✅ **AI Processing** - Placeholder for transcription and summarization
- ✅ **Batch Operations** - Process, delete, and export multiple videos
- ✅ **SRT Export** - Generate subtitle files from transcriptions
- ✅ **CORS Enabled** - Works with frontend on different ports

## Quick Start

### 1. Install Dependencies

```bash
cd vew-backend
npm install
```

### 2. Start Server

```bash
npm start
```

Or use the startup script:

```bash
cd ..
./start-backend.sh
```

The server will start on `http://localhost:3001`

## API Endpoints

### Health Check
```
GET /health
```

### Video Management
```
GET  /api/videos              # List all videos
GET  /api/video/:id           # Get video details
POST /api/upload              # Upload new video
POST /api/videos/batch-process    # Trigger AI processing
POST /api/videos/batch-delete     # Delete multiple videos
POST /api/videos/batch-export-srt # Export SRT subtitles
```

## Project Structure

```
vew-backend/
├── server.js           # Main Express application
├── services/
│   ├── storage.js      # Database operations
│   └── processor.js    # AI processing (placeholder)
├── db/
│   └── videos.json     # Video metadata storage
└── uploads/            # Uploaded video files
```

## Data Model

Each video record contains:

```typescript
{
  id: string;              // UUID
  filename: string;        // File name on disk
  originalName: string;    // Original upload name
  size: number;            // File size in bytes
  duration: number;        // Video duration in seconds
  uploadedAt: string;      // ISO timestamp
  status: string;          // pending | processing | completed | failed
  processing: {            // AI results (null if pending)
    transcription: Array;  // Speech-to-text segments
    summary: string;       // Video summary
    timeline: Array;       // Event timeline
  };
  transcriptReady: boolean;
}
```

## Configuration

- **Port**: 3001 (configured in `server.js`)
- **Upload Limit**: 500MB (configured in multer settings)
- **Storage**: `./uploads/` directory
- **Database**: `./db/videos.json`

## AI Integration

Currently, the processor uses placeholder data. To integrate real AI:

1. **Speech Recognition**: Replace in `services/processor.js`
   - Use OpenAI Whisper API
   - Or Azure Speech Services
   - Or Google Cloud Speech-to-Text

2. **Summarization**: Use LLM APIs
   - OpenAI GPT-4
   - Anthropic Claude
   - Google Gemini

Example integration:

```javascript
// services/processor.js
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function processVideo(videoId) {
  const video = await getVideoById(videoId);
  const filePath = path.join(__dirname, '../uploads', video.filename);
  
  // Transcribe with Whisper
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: 'whisper-1'
  });
  
  // Generate summary with GPT-4
  const summary = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'Summarize this video transcription' },
      { role: 'user', content: transcription.text }
    ]
  });
  
  // ... update video with results
}
```

## Development

Run with auto-reload:

```bash
npm run dev
```

## Troubleshooting

### Port already in use
```bash
# Find and kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### Permission errors
```bash
# Ensure directories are writable
chmod -R 755 vew-backend
```

### Module not found
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Production Deployment

For production use, consider:

1. **Database**: Migrate to PostgreSQL or MongoDB
2. **File Storage**: Use cloud storage (AWS S3, Google Cloud Storage)
3. **Authentication**: Add JWT-based auth
4. **Rate Limiting**: Implement request throttling
5. **Logging**: Use Winston or Pino
6. **Environment Variables**: Use dotenv for configuration
7. **Process Management**: Use PM2 or similar
8. **HTTPS**: Set up SSL/TLS
9. **CDN**: Serve videos through CDN

## License

MIT
