/**
 * Video composition utility for adding intro/outro to recorded videos
 */

import type { ExportFormat } from "./exportFormat";
import { getPresentationBackground, type PresentationSlideConfig } from "./presentationTemplates";

export interface ComposerOptions {
  introUrl?: string;
  outroUrl?: string;
  introSlide?: PresentationSlideConfig;
  outroSlide?: PresentationSlideConfig;
  mainVideoUrl: string;
  width: number;
  height: number;
  format?: ExportFormat;
  recordAudio: boolean;
  onProgress?: (stage: 'intro' | 'main' | 'outro' | 'finalizing', progress: number) => void;
}

/**
 * Compose a video with optional intro and outro
 * Returns a blob URL of the composed video
 */
export async function composeVideo(options: ComposerOptions): Promise<string> {
  const {
    introUrl, outroUrl, introSlide, outroSlide, mainVideoUrl,
    width, height, format = '16:9', recordAudio, onProgress,
  } = options;

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
      await renderPresentationSlide(ctx, item.slide, canvas.width, canvas.height, format, (progress) => {
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
  format: ExportFormat,
  onProgress: (progress: number) => void,
): Promise<void> {
  const frames = Math.max(1, Math.round(slide.durationSeconds * 30));
  let slideImage: HTMLImageElement | undefined;

  if (slide.imageUrl) {
    try {
      slideImage = await loadImage(slide.imageUrl);
    } catch (err) {
      console.warn('[videoComposer] Could not load presentation image:', err);
    }
  }

  for (let i = 0; i < frames; i++) {
    const progress = i / frames;
    drawPresentationSlide(ctx, slide, width, height, format, progress, slideImage);
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
  format: ExportFormat,
  progress: number,
  slideImage?: HTMLImageElement,
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
    drawMinimalTemplate(ctx, title, subtitle, width, height, format, accent, slideImage);
  } else if (slide.template === 'gradient') {
    drawGradientTemplate(ctx, title, subtitle, width, height, format, slideImage);
  } else {
    drawSpotlightTemplate(ctx, title, subtitle, width, height, format, accent, slideImage);
  }

  ctx.restore();
}

function drawSpotlightTemplate(
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string,
  width: number,
  height: number,
  format: ExportFormat,
  accent: string,
  slideImage?: HTMLImageElement,
): void {
  const isVertical = format === '9:16';
  const isSquare = format === '1:1';
  const cardX = width * (isVertical ? 0.08 : isSquare ? 0.12 : 0.16);
  const cardY = height * (isVertical ? 0.18 : isSquare ? 0.22 : 0.24);
  const cardW = width * (isVertical ? 0.84 : isSquare ? 0.76 : 0.68);
  const cardH = height * (isVertical ? 0.58 : isSquare ? 0.56 : 0.52);
  const imageSize = width * (isVertical ? 0.2 : isSquare ? 0.16 : 0.14);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  roundRect(ctx, cardX, cardY, cardW, cardH, isVertical ? 36 : 48);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const imageY = isVertical ? height * 0.24 : isSquare ? height * 0.28 : height * 0.28;
  if (slideImage) {
    drawRoundedImage(ctx, slideImage, width * 0.5 - imageSize / 2, imageY, imageSize, imageSize, 24);
  } else {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(width * 0.5, imageY + imageSize / 2, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  const titleY = slideImage
    ? height * (isVertical ? 0.52 : isSquare ? 0.54 : 0.54)
    : height * (isVertical ? 0.46 : isSquare ? 0.48 : 0.48);
  const subtitleY = slideImage
    ? height * (isVertical ? 0.68 : isSquare ? 0.7 : 0.7)
    : height * (isVertical ? 0.62 : isSquare ? 0.64 : 0.64);

  drawWrappedText(ctx, title, width / 2, titleY, cardW * 0.9, Math.round(width * (isVertical ? 0.085 : 0.07)), 0.92, '#fff', '900');
  if (subtitle) {
    drawWrappedText(ctx, subtitle, width / 2, subtitleY, cardW * 0.82, Math.round(width * (isVertical ? 0.03 : 0.026)), 1.35, 'rgba(255,255,255,0.78)', '700');
  }
}

function drawGradientTemplate(
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string,
  width: number,
  height: number,
  format: ExportFormat,
  slideImage?: HTMLImageElement,
): void {
  const isVertical = format === '9:16';
  const isSquare = format === '1:1';
  const useCentered = isVertical || isSquare;

  ctx.textBaseline = 'middle';
  ctx.textAlign = useCentered ? 'center' : 'left';

  if (!useCentered) {
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(width * 0.08, height * 0.16, 4, height * 0.68);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(width * 0.5 - 2, height * 0.14, 4, height * 0.72);
  }

  const imageSize = width * (isVertical ? 0.28 : isSquare ? 0.24 : 0.22);
  if (slideImage) {
    const imageX = useCentered ? width * 0.5 - imageSize / 2 : width * 0.68;
    const imageY = useCentered ? height * 0.18 : height * 0.24;
    drawRoundedImage(ctx, slideImage, imageX, imageY, imageSize, imageSize, 32);
  }

  const textX = useCentered ? width / 2 : width * 0.14;
  const titleY = useCentered ? height * (slideImage ? 0.56 : 0.48) : height * 0.44;
  const subtitleY = useCentered ? height * (slideImage ? 0.72 : 0.64) : height * 0.66;
  const maxTextWidth = width * (useCentered ? 0.82 : 0.76);

  drawWrappedText(ctx, title, textX, titleY, maxTextWidth, Math.round(width * (isVertical ? 0.09 : 0.082)), 0.9, '#fff', '900', useCentered ? 'center' : 'left');
  if (subtitle) {
    drawWrappedText(ctx, subtitle, textX, subtitleY, maxTextWidth * 0.92, Math.round(width * (isVertical ? 0.032 : 0.027)), 1.35, 'rgba(255,255,255,0.78)', '700', useCentered ? 'center' : 'left');
  }
}

function drawMinimalTemplate(
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string,
  width: number,
  height: number,
  format: ExportFormat,
  accent: string,
  slideImage?: HTMLImageElement,
): void {
  const isVertical = format === '9:16';
  const isSquare = format === '1:1';
  const cardX = width * (isVertical ? 0.1 : isSquare ? 0.14 : 0.2);
  const cardY = height * (isVertical ? 0.24 : isSquare ? 0.28 : 0.3);
  const cardW = width * (isVertical ? 0.8 : isSquare ? 0.72 : 0.6);
  const cardH = height * (isVertical ? 0.48 : isSquare ? 0.44 : 0.4);
  const imageSize = width * (isVertical ? 0.14 : isSquare ? 0.12 : 0.09);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  roundRect(ctx, cardX, cardY, cardW, cardH, isVertical ? 24 : 28);
  ctx.fill();

  const imageY = isVertical ? height * 0.3 : isSquare ? height * 0.34 : height * 0.34;
  if (slideImage) {
    drawRoundedImage(ctx, slideImage, width * 0.5 - imageSize / 2, imageY, imageSize, imageSize, 18);
  } else {
    ctx.fillStyle = accent;
    roundRect(ctx, width * 0.5 - width * 0.06, imageY + imageSize * 0.35, width * 0.12, 8, 4);
    ctx.fill();
  }

  const titleY = slideImage
    ? height * (isVertical ? 0.52 : isSquare ? 0.54 : 0.54)
    : height * (isVertical ? 0.48 : isSquare ? 0.5 : 0.5);
  const subtitleY = slideImage
    ? height * (isVertical ? 0.64 : isSquare ? 0.66 : 0.66)
    : height * (isVertical ? 0.6 : isSquare ? 0.62 : 0.62);

  drawWrappedText(ctx, title, width / 2, titleY, cardW * 0.82, Math.round(width * (isVertical ? 0.065 : 0.055)), 1.0, '#fff', '900');
  if (subtitle) {
    drawWrappedText(ctx, subtitle, width / 2, subtitleY, cardW * 0.78, Math.round(width * (isVertical ? 0.028 : 0.023)), 1.35, 'rgba(255,255,255,0.72)', '700');
  }
}


function drawRoundedImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.save();
  roundRect(ctx, x, y, width, height, radius);
  ctx.clip();
  drawImageCover(ctx, image, x, y, width, height);
  ctx.restore();

  ctx.strokeStyle = 'rgba(255,255,255,0.24)';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, width, height, radius);
  ctx.stroke();
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const scaledWidth = image.naturalWidth * scale;
  const scaledHeight = image.naturalHeight * scale;
  ctx.drawImage(image, x + (width - scaledWidth) / 2, y + (height - scaledHeight) / 2, scaledWidth, scaledHeight);
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
