# Vew Backend - AI Dependencies

## Python Requirements

Install Python dependencies for AI processing:

```bash
pip install faster-whisper
```

### System Requirements

**faster-whisper** requires:
- Python 3.8+
- FFmpeg (for audio extraction)

### Install FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
Download from https://ffmpeg.org/download.html

### Verify Installation

```bash
python3 -c "from faster_whisper import WhisperModel; print('✓ faster-whisper installed')"
ffmpeg -version
```

## Models

First run will auto-download the model:
- **base** model: ~74MB
- Stored in: `~/.cache/whisper/`

## Usage

The AI processor is automatically called when you click "Process" or enable "Auto-process" on upload.

### Manual Testing

```bash
cd vew-backend
python3 ai_processor.py uploads/your-video.webm
```

## Troubleshooting

### "Module not found: faster_whisper"
```bash
pip install faster-whisper
```

### "FFmpeg not found"
Install FFmpeg using the commands above.

### Slow first run
The model downloads on first use (~74MB). Subsequent runs are fast.
