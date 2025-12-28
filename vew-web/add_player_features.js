const fs = require('fs');

let content = fs.readFileSync('src/pages/PlayerPage.tsx', 'utf8');

// 1. Add isRegenerating state after activeTab
content = content.replace(
    /const \[activeTab, setActiveTab\] = useState<'transcript' \| 'summary' \| 'timeline'>\('transcript'\);/,
    `const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'timeline'>('transcript');
    const [isRegenerating, setIsRegenerating] = useState(false);`
);

// 2. Add handleRegenerateTimeline function after handleExportSRT
const regenerateHandler = `
    const handleRegenerateTimeline = async () => {
        if (!video || !id) return;

        setIsRegenerating(true);
        try {
            const result = await regenerateTimeline(id);
            
            // Update video with new timeline
            setVideo({
                ...video,
                processing: {
                    ...video.processing!,
                    timeline: result.timeline
                }
            });
            
            console.log(\`✅ Timeline regenerated: \${result.count} events\`);
        } catch (error) {
            console.error('Failed to regenerate timeline:', error);
        } finally {
            setIsRegenerating(false);
        }
    };
`;

content = content.replace(
    /(const handleExportSRT = \(\) => \{[^}]+\};)/,
    `$1\n${regenerateHandler}`
);

fs.writeFileSync('src/pages/PlayerPage.tsx', content);
console.log('✓ Added regenerate timeline handler to PlayerPage.tsx');
