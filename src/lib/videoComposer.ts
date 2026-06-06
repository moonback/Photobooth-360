/**
 * Video composition utility for adding intro/outro to recorded videos
 */

import { getPresentationBackground, type PresentationSlideConfig } from "./presentationTemplates";

export interface ComposerOptions {
  introUrl?: string;
  outroUrl?: string;
  introSlide?: PresentationSlideConfig;
  outroSlide?: PresentationSlideConfig;
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
  const { introUrl, outroUrl, introSlide, outroSlide, mainVideoUrl, width, height, recordAudio, onProgress } = options;

  // If no intro/outro, return the main video as-is
  if (!introUrl && !outroUrl && !introSlide && !outroSlide) {
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
  const sequence: Array<{ url?: string; slide?: PresentationSlideConfig; type: 'intro' | 'main' | 'outro' }> = [];
  if (introSlide) sequence.push({ slide: introSlide, type: 'intro' });
  else if (introUrl) sequence.push({ url: introUrl, type: 'intro' });
  sequence.push({ url: mainVideoUrl, type: 'main' });
  if (outroSlide) sequence.push({ slide: outroSlide, type: 'outro' });
  else if (outroUrl) sequence.push({ url: outroUrl, type: 'outro' });

  for (const item of sequence) {
    if (item.slide) {
      await renderPresentationSlide(ctx, item.slide, canvas.width, canvas.height, (progress) => {
        onProgress?.(item.type, progress);
      });
      continue;
    }

    if (item.url) {
      await renderMedia(ctx, item.url, item.type, canvas.width, canvas.height, (progress) => {
        onProgress?.(item.type, progress);
      });
    }
  }

  // Stop recording
  recorder.stop();
  onProgress?.('finalizing', 100);

  // Wait for the blob
  const blob = await recordingPromise;
  return URL.createObjectURL(blob);
}


/**
 * Render a generated presentation slide for text-based intro/outro templates.
 */
async function renderPresentationSlide(
  ctx: CanvasRenderingContext2D,
  slide: PresentationSlideConfig,
  width: number,
  height: number,
  onProgress: (progress: number) => void,
): Promise<void> {
  const frames = Math.max(1, Math.round(slide.durationSeconds * 30));

  for (let i = 0; i < frames; i++) {
    const progress = i / frames;
    drawPresentationSlide(ctx, slide, width, height, progress);
    onProgress(Math.round(progress * 100));
    await delay(1000 / 30);
  }

  onProgress(100);
}

function drawPresentationSlide(
  ctx: CanvasRenderingContext2D,
  slide: PresentationSlideConfig,
  width: number,
  height: number,
  progress: number,
): void {
  const background = getPresentationBackground(slide.background);
  const [start, accent, end] = background.colors;
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, start);
  gradient.addColorStop(0.5, accent);
  gradient.addColorStop(1, end);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  drawGlow(ctx, width * 0.5, height * 0.2, width * 0.36, accent, 0.26);
  drawGlow(ctx, width * 0.85, height * 0.78, width * 0.24, '#ffffff', 0.08);

  const eased = easeOutCubic(Math.min(1, progress * 1.8));
  const title = slide.title.trim() || 'Votre message';
  const subtitle = slide.subtitle.trim();

  ctx.save();
  ctx.globalAlpha = eased;
  ctx.translate(0, (1 - eased) * 36);

  if (slide.template === 'minimal') {
    drawMinimalTemplate(ctx, title, subtitle, width, height, accent);
  } else if (slide.template === 'gradient') {
    drawGradientTemplate(ctx, title, subtitle, width, height);
  } else {
    drawSpotlightTemplate(ctx, title, subtitle, width, height, accent);
  }

  ctx.restore();
}

function drawSpotlightTemplate(
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string,
  width: number,
  height: number,
  accent: string,
): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  roundRect(ctx, width * 0.16, height * 0.24, width * 0.68, height * 0.52, 48);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(width * 0.5, height * 0.32, 10, 0, Math.PI * 2);
  ctx.fill();

  drawWrappedText(ctx, title, width / 2, height * 0.48, width * 0.68, Math.round(width * 0.07), 0.92, '#fff', '900');
  if (subtitle) drawWrappedText(ctx, subtitle, width / 2, height * 0.64, width * 0.58, Math.round(width * 0.026), 1.35, 'rgba(255,255,255,0.78)', '700');
}

function drawGradientTemplate(
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string,
  width: number,
  height: number,
): void {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(width * 0.08, height * 0.16, 4, height * 0.68);
  drawWrappedText(ctx, title, width * 0.14, height * 0.44, width * 0.76, Math.round(width * 0.082), 0.9, '#fff', '900', 'left');
  if (subtitle) drawWrappedText(ctx, subtitle, width * 0.14, height * 0.66, width * 0.62, Math.round(width * 0.027), 1.35, 'rgba(255,255,255,0.78)', '700', 'left');
}

function drawMinimalTemplate(
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string,
  width: number,
  height: number,
  accent: string,
): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  roundRect(ctx, width * 0.2, height * 0.3, width * 0.6, height * 0.4, 28);
  ctx.fill();
  ctx.fillStyle = accent;
  roundRect(ctx, width * 0.44, height * 0.36, width * 0.12, 8, 4);
  ctx.fill();
  drawWrappedText(ctx, title, width / 2, height * 0.5, width * 0.5, Math.round(width * 0.055), 1.0, '#fff', '900');
  if (subtitle) drawWrappedText(ctx, subtitle, width / 2, height * 0.62, width * 0.46, Math.round(width * 0.023), 1.35, 'rgba(255,255,255,0.72)', '700');
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  centerY: number,
  maxWidth: number,
  fontSize: number,
  lineHeightRatio: number,
  color: string,
  weight: string,
  align: CanvasTextAlign = 'center',
): void {
  ctx.font = `${weight} ${fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }

  if (line) lines.push(line);
  const lineHeight = fontSize * lineHeightRatio;
  const startY = centerY - ((lines.length - 1) * lineHeight) / 2;
  lines.slice(0, 4).forEach((lineText, index) => ctx.fillText(lineText, x, startY + index * lineHeight));
}

function drawGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number,
): void {
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
  glow.addColorStop(0, `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`);
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
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
