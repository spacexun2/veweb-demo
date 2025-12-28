import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../db/videos.json');

// Read database
export async function readDB() {
    try {
        const data = await fs.readFile(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading database:', error);
        return [];
    }
}

// Write database
export async function writeDB(videos) {
    try {
        await fs.writeFile(DB_PATH, JSON.stringify(videos, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error('Error writing database:', error);
        return false;
    }
}

// Get all videos (optionally filtered by userId for demo)
export async function getAllVideos(userId = null) {
    const videos = await readDB();

    // If userId is provided, filter videos
    if (userId) {
        return videos.filter(v => v.userId === userId);
    }

    // Otherwise return all (for backward compatibility)
    return videos;
}

// Get video by ID (with optional user check)
export async function getVideoById(id, userId = null) {
    const videos = await readDB();
    const video = videos.find(v => v.id === id);

    // If userId is provided, verify ownership
    if (video && userId && video.userId !== userId) {
        return null; // User doesn't own this video
    }

    return video;
}

// Add new video (with userId)
export async function addVideo(video, userId = null) {
    const videos = await readDB();

    // Add userId to video if provided
    if (userId) {
        video.userId = userId;
    }

    videos.unshift(video);
    await writeDB(videos);
    return video;
}

// Update video (with ownership check)
export async function updateVideo(id, updates, userId = null) {
    const videos = await readDB();
    const index = videos.findIndex(v => v.id === id);

    if (index === -1) return null;

    // Check ownership if userId provided
    if (userId && videos[index].userId !== userId) {
        return null; // Not authorized
    }

    videos[index] = { ...videos[index], ...updates };
    await writeDB(videos);
    return videos[index];
}

// Delete video (with ownership check)
export async function deleteVideo(id, userId = null) {
    const videos = await readDB();
    const video = videos.find(v => v.id === id);

    // Check ownership if userId provided
    if (userId && video && video.userId !== userId) {
        return false; // Not authorized
    }

    const filtered = videos.filter(v => v.id !== id);

    if (filtered.length === videos.length) return false;

    await writeDB(filtered);
    return true;
}

// Delete multiple videos (with ownership check)
export async function deleteVideos(ids, userId = null) {
    const videos = await readDB();

    // Filter out videos user doesn't own if userId provided
    let toDelete = ids;
    if (userId) {
        toDelete = ids.filter(id => {
            const video = videos.find(v => v.id === id);
            return video && video.userId === userId;
        });
    }

    const filtered = videos.filter(v => !toDelete.includes(v.id));
    await writeDB(filtered);
    return videos.length - filtered.length;
}
