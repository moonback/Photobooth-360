/**
 * Video composition utility for adding intro/outro to recorded videos
 */

export interface ComposerOptions {
  introUrl?: string;
  outroUrl?: string;
  mainVideoUrl: string;
  width: number;
  height: number;
  recordAudio: boolean;
  onProgress?: (stage: 'intro' | 'main' | 'outro' | 'finalizing', progress: number) => void;
}

/**
 * Compose a video with optional intro and outro
 * Returns a blob URL of the composed video
 */
export async function composeVideo(options: ComposerOptions): Promise<string> {
  const { introUrl, outroUrl, mainVideoUrl, width, height, recordAudio, onProgress } = options;

  // If no intro/outro, return the main video as-is
  if (!introUrl && !outroUrl) {
    return mainVideoUrl;
  }

  // Create canvas for composition
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Failed to get canvas context');

  // Create MediaRecorder
  const stream = canvas.captureStream(30); // 30 fps
  
  // Add audio track if needed
  if (recordAudio) {
    try {
      const mainVideo = await loadVideo(mainVideoUrl);
      if (mainVideo.srcObject instanceof MediaStream) {
        const audioTracks = (mainVideo.srcObject as MediaStream).getAudioTracks();
        audioTracks.forEach(track => stream.addTrack(track));
      }
    } catch (err) {
      console.warn('[videoComposer] Could not extract audio track:', err);
    }
  }

  const chunks: Blob[] = [];
  let recorder: MediaRecorder;

  try {
    recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp8,opus',
    });
  } catch {
    recorder = new MediaRecorder(stream);
  }

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  // Start recording
  const recordingPromise = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      resolve(blob);
    };
  });

  recorder.start();

  // Render sequence: intro → main → outro
  const sequence: Array<{ url: string; type: 'intro' | 'main' | 'outro' }> = [];
  if (introUrl) sequence.push({ url: introUrl, type: 'intro' });
  sequence.push({ url: mainVideoUrl, type: 'main' });
  if (outroUrl) sequence.push({ url: outroUrl, type: 'outro' });

  for (const item of sequence) {
    await renderMedia(ctx, item.url, item.type, canvas.width, canvas.height, (progress) => {
      onProgress?.(item.type, progress);
    });
  }

  // Stop recording
  recorder.stop();
  onProgress?.('finalizing', 100);

  // Wait for the blob
  const blob = await recordingPromise;
  return URL.createObjectURL(blob);
}

/**
 * Render a single media item (video or image) to the canvas
 */
async function renderMedia(
  ctx: CanvasRenderingContext2D,
  url: string,
  type: 'intro' | 'main' | 'outro',
  width: number,
  height: number,
  onProgress: (progress: number) => void,
): Promise<void> {
  const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);

  if (isImage) {
    // Render static image for 2 seconds at 30fps (60 frames)
    const img = await loadImage(url);
    const frames = 60; // 2 seconds at 30fps
    for (let i = 0; i < frames; i++) {
      drawCentered(ctx, img, width, height);
      onProgress(Math.round((i / frames) * 100));
      await delay(1000 / 30); // 30fps
    }
    onProgress(100);
  } else {
    // Render video
    const video = await loadVideo(url);
    video.muted = type !== 'main'; // Only main video plays audio
    
    await new Promise<void>((resolve, reject) => {
      video.onended = () => resolve();
      video.onerror = () => reject(new Error(`Failed to play video: ${url}`));

      // Draw frames
      const drawFrame = () => {
        if (video.paused || video.ended) return;
        drawCentered(ctx, video, width, height);
        
        if (video.duration > 0) {
          const progress = Math.round((video.currentTime / video.duration) * 100);
          onProgress(progress);
        }
        
        requestAnimationFrame(drawFrame);
      };

      video.play().then(() => {
        drawFrame();
      }).catch(reject);
    });
  }
}

/**
 * Draw an image or video centered on the canvas, maintaining aspect ratio
 */
function drawCentered(
  ctx: CanvasRenderingContext2D,
  source: HTMLImageElement | HTMLVideoElement,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const sourceWidth = source instanceof HTMLImageElement ? source.naturalWidth : source.videoWidth;
  const sourceHeight = source instanceof HTMLImageElement ? source.naturalHeight : source.videoHeight;

  // Calculate scaling to cover the canvas while maintaining aspect ratio
  const scale = Math.max(canvasWidth / sourceWidth, canvasHeight / sourceHeight);
  const scaledWidth = sourceWidth * scale;
  const scaledHeight = sourceHeight * scale;

  // Center the image/video
  const x = (canvasWidth - scaledWidth) / 2;
  const y = (canvasHeight - scaledHeight) / 2;

  // Fill background with black
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Draw the source
  ctx.drawImage(source, x, y, scaledWidth, scaledHeight);
}

/**
 * Load an image
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Load a video
 */
function loadVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.onloadeddata = () => resolve(video);
    video.onerror = () => reject(new Error(`Failed to load video: ${url}`));
    video.src = url;
  });
}

/**
 * Simple delay utility
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
