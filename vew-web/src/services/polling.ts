import type { ProcessingResult } from '../types';

export class ProcessingPoller {
    private intervalId: number | null = null;

    async pollUntilComplete(
        videoId: string,
        onUpdate: (status: string) => void,
        options = {
            maxAttempts: 60,
            interval: 2000
        }
    ): Promise<ProcessingResult> {
        let attempts = 0;

        return new Promise((resolve, reject) => {
            this.intervalId = window.setInterval(async () => {
                attempts++;

                try {
                    const response = await fetch(`/api/video/${videoId}`);

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }

                    const data = await response.json();

                    if (data.processing) {
                        onUpdate(data.processing.status);

                        if (data.processing.status === 'completed') {
                            this.stop();
                            resolve(data.processing);
                        } else if (data.processing.status === 'failed') {
                            this.stop();
                            reject(new Error(data.processing.error || 'Processing failed'));
                        } else if (attempts >= options.maxAttempts) {
                            this.stop();
                            reject(new Error('Processing timeout'));
                        }
                    }
                } catch (error) {
                    this.stop();
                    reject(error);
                }
            }, options.interval);
        });
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}
