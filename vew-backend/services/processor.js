import { updateVideo } from './storage.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * AI Processing Service with faster-whisper integration
 */

export async function processVideo(videoId, videoPath) {
    console.log(`🤖 Starting AI processing for video: ${videoId}`);

    // Initialize processing state with empty transcription
    await updateVideo(videoId, {
        status: 'processing',
        processing: {
            transcription: [],
            summary: 'AI processing in progress...',
            timeline: []
        }
    });

    try {
        // Call Python AI processor
        const result = await runPythonProcessor(videoPath);

        if (result.error) {
            throw new Error(result.error);
        }

        // Update video with final AI results
        await updateVideo(videoId, {
            status: 'completed',
            processing: {
                transcription: result.transcription,
                summary: result.summary,
                timeline: result.timeline
            },
            transcriptReady: true,
            duration: result.duration || 0
        });

        console.log(`✅ Processing completed for video: ${videoId}`);
        return { success: true, message: 'Processing completed' };

    } catch (error) {
        console.error(`❌ Processing failed for video: ${videoId}`, error);
        await updateVideo(videoId, {
            status: 'failed',
            processing: {
                error: error.message
            }
        });
        return { success: false, error: error.message };
    }
}

export async function batchProcess(videoIds, videoPaths) {
    console.log(`🤖 Batch processing ${videoIds.length} videos`);

    const results = [];

    for (let i = 0; i < videoIds.length; i++) {
        const id = videoIds[i];
        const videoPath = videoPaths[i];

        try {
            const result = await processVideo(id, videoPath);
            results.push(result);
        } catch (error) {
            results.push({ success: false, error: error.message });
        }
    }

    const successCount = results.filter(r => r.success).length;

    return {
        success: true,
        processed: successCount,
        failed: videoIds.length - successCount
    };
}

/**
 * Run Python AI processor script
 */
function runPythonProcessor(videoPath, modelSize = 'base') {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '../ai_processor_api.py');

        // Check if Python is available
        const pythonCmd = 'python3'; // or 'python' on Windows

        const process = spawn(pythonCmd, [scriptPath, videoPath, modelSize]);

        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
            stderr += data.toString();
            // Log progress to console
            console.log('[AI]', data.toString().trim());
        });

        process.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Python process exited with code ${code}\n${stderr}`));
                return;
            }

            try {
                const result = JSON.parse(stdout);
                resolve(result);
            } catch (error) {
                reject(new Error(`Failed to parse AI processor output: ${error.message}\n${stdout}`));
            }
        });

        process.on('error', (error) => {
            reject(new Error(`Failed to start Python process: ${error.message}`));
        });

        // Timeout after 5 minutes
        setTimeout(() => {
            process.kill();
            reject(new Error('AI processing timeout (5 minutes)'));
        }, 5 * 60 * 1000);
    });
}

// Generate SRT subtitle file
export function generateSRT(transcription) {
    if (!transcription || !transcription.length) {
        return '';
    }

    return transcription.map((segment, index) => {
        const startTime = formatSRTTime(segment.start);
        const endTime = formatSRTTime(segment.end);

        return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n`;
    }).join('\n');
}

function formatSRTTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(ms, 3)}`;
}

function pad(num, size = 2) {
    return String(num).padStart(size, '0');
}
