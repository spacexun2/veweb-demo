import type { UploadResponse } from '../types';

export async function uploadVideo(
    blob: Blob,
    onProgress?: (percent: number) => void
): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('video', blob, `vew-recording-${Date.now()}.webm`);

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Progress listener
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
                const percent = (event.loaded / event.total) * 100;
                onProgress(percent);
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response);
                } catch (error) {
                    reject(new Error('Invalid response from server'));
                }
            } else {
                reject(new Error(`Upload failed: ${xhr.status}`));
            }
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.ontimeout = () => reject(new Error('Upload timeout'));

        xhr.timeout = 120000; // 2 minutes timeout
        xhr.open('POST', '/api/upload');
        xhr.send(formData);
    });
}
