const fs = require('fs');

// Fix api.ts - the regenerateTimeline is inside checkHealth function, need to move it out
let content = fs.readFileSync('src/services/api.ts', 'utf8');

// Remove the incorrectly placed function
content = content.replace(/\n    \/\/ Regenerate timeline.*?}\n\n\n$/s, '');

// Add it correctly at the end
content = content.trimEnd() + `
}

// Regenerate timeline for a video
export async function regenerateTimeline(videoId: string): Promise<{ success: boolean; timeline: any[]; count: number }> {
    const response = await api.post(\`/api/videos/\${videoId}/regenerate-timeline\`);
    return response.data;
}
`;

fs.writeFileSync('src/services/api.ts', content);
console.log('✓ Fixed api.ts');
