import { useState, useRef, useCallback } from 'react';
import { fetchFile } from '@ffmpeg/util';
import type { MusicSelection } from '../lib/backgroundMusic';
import { getTrackById } from '../lib/backgroundMusic';
import { cleanupFiles, getFFmpeg, resetFFmpeg } from '../lib/ffmpegCore';
import { computeMusicStartOffset, getMediaDuration } from '../lib/musicSync';
import { buildCropFilter, getExportDimensions, type ExportFormat } from '../lib/exportFormat';

export type SlowMotionSpeed = 0.5 | 0.25;
export type { ExportFormat };

export type ProcessingStatus = 'idle' | 'loading' | 'processing' | 'done' | 'error';

export interface ProcessVideoOptions {
  music?: MusicSelection;
  musicVolume?: number;
  mixWithVideoAudio?: boolean;
}

interface UseSlowMotionReturn {
  processVideo: (
    inputUrl: string,
    speed: 1 | SlowMotionSpeed,
    format?: ExportFormat,
    options?: ProcessVideoOptions,
  ) => Promise<string | null>;
  status: ProcessingStatus;
  progress: number;
  errorMessage: string;
  cancel: () => void;
}

function getSlowMotionVideoFilter(speed: 1 | SlowMotionSpeed): string | null {
  return speed === 1 ? null : `setpts=${(1 / speed).toFixed(1)}*PTS`;
}

function getSlowMotionAudioFilter(speed: SlowMotionSpeed): string {
  return speed === 0.25 ? 'atempo=0.5,atempo=0.5' : `atempo=${speed}`;
}

function buildBackgroundMusicFilter(volume: number): string {
  return `[1:a]volume=${(volume / 100).toFixed(2)}[a]`;
}

function buildAudioFilter(volume: number, mixWithVideoAudio: boolean): string {
  const vol = (volume / 100).toFixed(2);
  if (mixWithVideoAudio) {
    return `[1:a]volume=${vol}[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=2[a]`;
  }
  return buildBackgroundMusicFilter(volume);
}

function buildMusicInputArgs(startOffsetSec: number): string[] {
  if (startOffsetSec > 0.05) {
    return ['-ss', startOffsetSec.toFixed(3), '-stream_loop', '-1', '-i', 'music.mp3'];
  }
  return ['-stream_loop', '-1', '-i', 'music.mp3'];
}

async function resolveMusicStartOffset(
  videoUrl: string,
  trackFile: string,
  highlightAt: number,
  speed: 1 | SlowMotionSpeed,
): Promise<number> {
  try {
    const [videoDuration, musicDuration] = await Promise.all([
      getMediaDuration(videoUrl),
      getMediaDuration(trackFile),
    ]);
    const processedVideoDuration = speed === 1 ? videoDuration : videoDuration / speed;
    return computeMusicStartOffset(processedVideoDuration, musicDuration, highlightAt);
  } catch {
    return 0;
  }
}

function needsProcessing(
  speed: 1 | SlowMotionSpeed,
  format: ExportFormat,
  music?: MusicSelection,
): boolean {
  const hasMusic = music && music !== 'none';
  return speed !== 1 || format !== '16:9' || Boolean(hasMusic);
}
interface BrowserEncodeOptions {
  inputUrl: string;
  speed: 1 | SlowMotionSpeed;
  format: ExportFormat;
  music?: MusicSelection;
  musicVolume: number;
  mixWithVideoAudio: boolean;
  musicStartOffset: number;
  onProgress: (progress: number) => void;
}

function getRecorderMimeType(): string | undefined {
  const candidates = [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm',
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

function createMediaElement<T extends HTMLMediaElement>(tag: 'audio' | 'video', url: string): T {
  const element = document.createElement(tag) as T;
  element.crossOrigin = 'anonymous';
  element.preload = 'auto';
  element.src = url;
  return element;
}

async function waitVideoReady(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 2 && Number.isFinite(video.duration)) return;

  await new Promise<void>((resolve, reject) => {
    const onMetadata = () => resolve();
    const onError = () => reject(new Error('Failed to load video metadata'));

    video.addEventListener('loadedmetadata', onMetadata, { once: true });
    video.addEventListener('error', onError, { once: true });

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      video.removeEventListener('loadedmetadata', onMetadata);
      video.removeEventListener('error', onError);
      reject(new Error('Video metadata loading timed out'));
    }, 10000);

    // Cleanup on resolve
    const originalResolve = resolve;
    resolve = () => {
      clearTimeout(timeout);
      video.removeEventListener('error', onError);
      originalResolve();
    };
  });

  if (!Number.isFinite(video.duration)) {
    throw new Error('Invalid video duration (Infinity)');
  }
}

function waitForMetadata(element: HTMLMediaElement): Promise<void> {
  // Check if metadata is already loaded
  if (element.readyState >= HTMLMediaElement.HAVE_METADATA) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const onMetadata = () => {
      cleanup();
      resolve();
    };
    
    const onError = () => {
      cleanup();
      reject(new Error('Échec chargement métadonnées média'));
    };
    
    const cleanup = () => {
      element.removeEventListener('loadedmetadata', onMetadata);
      element.removeEventListener('error', onError);
    };
    
    element.addEventListener('loadedmetadata', onMetadata, { once: true });
    element.addEventListener('error', onError, { once: true });
    
    // Add a timeout in case metadata never loads (e.g., infinite duration videos)
    setTimeout(() => {
      cleanup();
      resolve(); // Resolve anyway to continue processing
    }, 5000);
  });
}

function drawVideoCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
): void {
  const scale = Math.max(width / video.videoWidth, height / video.videoHeight);
  const scaledWidth = video.videoWidth * scale;
  const scaledHeight = video.videoHeight * scale;
  const x = (width - scaledWidth) / 2;
  const y = (height - scaledHeight) / 2;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(video, x, y, scaledWidth, scaledHeight);
}

async function encodeWithBrowser({
  inputUrl,
  speed,
  format,
  music = 'none',
  musicVolume,
  mixWithVideoAudio,
  musicStartOffset,
  onProgress,
}: BrowserEncodeOptions): Promise<{ url: string; blobSize: number }> {
  console.log('[encodeWithBrowser] 🎬 Starting browser encoding with params:', { inputUrl, speed, format, music, musicVolume, mixWithVideoAudio, musicStartOffset });
  if (!('MediaRecorder' in window)) {
    throw new Error('MediaRecorder indisponible');
  }

  console.log('[encodeWithBrowser] 🎥 Loading video...');
  const video = createMediaElement<HTMLVideoElement>('video', inputUrl);
  video.muted = music !== 'none' || !mixWithVideoAudio;
  video.playsInline = true;
  video.playbackRate = speed;
  
  try {
    await waitVideoReady(video);
    console.log('[encodeWithBrowser] ✅ Video loaded, duration:', video.duration, 's, size:', video.videoWidth, 'x', video.videoHeight);
  } catch (error) {
    console.warn('[encodeWithBrowser] ⚠️ Video metadata issue, falling back to waitForMetadata:', error);
    await waitForMetadata(video);
    console.log('[encodeWithBrowser] ✅ Video loaded (fallback), duration:', video.duration, 's, size:', video.videoWidth, 'x', video.videoHeight);
  }

  const dimensions = format === '16:9'
    ? { width: video.videoWidth || 1280, height: video.videoHeight || 720 }
    : getExportDimensions('720p', format);
  console.log('[encodeWithBrowser] 🖼️ Output dimensions:', dimensions);
  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas indisponible');
  console.log('[encodeWithBrowser] ✅ Canvas created');

  const stream = canvas.captureStream(30);
  const audioContext = typeof AudioContext !== 'undefined' ? new AudioContext() : undefined;
  const audioDestination = audioContext?.createMediaStreamDestination();
  let musicElement: HTMLAudioElement | null = null;

  if (audioContext && audioDestination) {
    if (music !== 'none') {
      console.log('[encodeWithBrowser] 🎵 Loading music...');
      const track = getTrackById(music);
      musicElement = createMediaElement<HTMLAudioElement>('audio', track.file);
      musicElement.loop = true;
      await waitForMetadata(musicElement);
      musicElement.currentTime = Math.min(musicStartOffset, Math.max(0, musicElement.duration - 0.1));
      console.log('[encodeWithBrowser] ✅ Music loaded, duration:', musicElement.duration, 's');

      const musicSource = audioContext.createMediaElementSource(musicElement);
      const gain = audioContext.createGain();
      gain.gain.value = musicVolume / 100;
      musicSource.connect(gain).connect(audioDestination);
    }

    if (mixWithVideoAudio) {
      try {
        console.log('[encodeWithBrowser] 🎵 Adding video audio...');
        const videoAudioSource = audioContext.createMediaElementSource(video);
        videoAudioSource.connect(audioDestination);
      } catch {
        console.warn('[encodeWithBrowser] ⚠️ Could not mix video audio, skipping');
      }
    }

    audioDestination.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
  }

  const chunks: Blob[] = [];
  const recorderOptions = getRecorderMimeType();
  console.log('[encodeWithBrowser] 🎥 Creating MediaRecorder with options:', recorderOptions);
  const recorder = recorderOptions
    ? new MediaRecorder(stream, { mimeType: recorderOptions })
    : new MediaRecorder(stream);

  const recordingPromise = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        console.log('[encodeWithBrowser] 📦 Data chunk:', event.data.size, 'bytes');
        chunks.push(event.data);
      }
    };
    recorder.onstop = () => {
      console.log('[encodeWithBrowser] ⏹️ Recording stopped');
      resolve(new Blob(chunks, { type: recorder.mimeType || 'video/webm' }));
    };
    recorder.onerror = () => reject(new Error('Échec enregistrement navigateur'));
  });

  console.log('[encodeWithBrowser] ▶️ Starting recording with 100ms timeslice...');
  recorder.start(100); // Start with timeslice to get periodic data chunks
  await audioContext?.resume();
  console.log('[encodeWithBrowser] ▶️ Starting playback...');
  await Promise.all([
    video.play(),
    musicElement?.play() ?? Promise.resolve(),
  ]);

  await new Promise<void>((resolve) => {
    const startTime = Date.now();
    let lastBufferedCheck = 0;
    let noNewDataCount = 0;
    
    // Draw frames at 30fps to match MediaRecorder stream
    const interval = setInterval(() => {
      drawVideoCover(ctx, video, canvas.width, canvas.height);
      
      // Update progress
      if (Number.isFinite(video.duration) && video.duration > 0) {
        onProgress(Math.min(99, Math.round((video.currentTime / video.duration) * 100)));
      } else {
        // For infinite duration videos, use elapsed time as fallback
        const elapsed = (Date.now() - startTime) / 1000;
        onProgress(Math.min(99, Math.round(Math.min(elapsed / 60, 1) * 100))); // Cap at 60s
      }

      // Check if video has ended
      if (video.ended) {
        console.log('[encodeWithBrowser] ⏹️ Video ended, waiting 500ms to collect all data...');
        clearInterval(interval);
        setTimeout(resolve, 500);
        return;
      }
      
      // Handle infinite duration videos - check buffered ranges
      if (!Number.isFinite(video.duration)) {
        const now = Date.now();
        if (now - lastBufferedCheck > 1000) { // Check every second
          lastBufferedCheck = now;
          
          if (video.buffered.length > 0) {
            const bufferedEnd = video.buffered.end(video.buffered.length - 1);
            const timeSinceBufferedEnd = video.currentTime - bufferedEnd;
            
            // If we're close to the end of buffered data and not getting new data
            if (timeSinceBufferedEnd > -0.5 && video.currentTime > 1) {
              noNewDataCount++;
              if (noNewDataCount >= 3) { // No new data for 3 seconds
                console.log('[encodeWithBrowser] ⏹️ End of buffered data reached, stopping...');
                clearInterval(interval);
                setTimeout(resolve, 500);
                return;
              }
            } else {
              noNewDataCount = 0;
            }
          }
        }
      }
    }, 1000 / 30); // 30fps
  });

  console.log('[encodeWithBrowser] ⏹️ Stopping recorder...');
  recorder.stop();
  musicElement?.pause();
  video.pause();
  audioContext?.close().catch(() => undefined);

  console.log('[encodeWithBrowser] ⏳ Waiting for final blob...');
  const blob = await recordingPromise;
  const finalUrl = URL.createObjectURL(blob);
  console.log('[encodeWithBrowser] 🎉 Browser encoding complete! Blob size:', blob.size, 'bytes, URL:', finalUrl);
  return { url: finalUrl, blobSize: blob.size };
}


export function useSlowMotion(): UseSlowMotionReturn {
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const cancelledRef = useRef(false);
  const startTimeRef = useRef<number>(0);

  const processVideo = useCallback(async (
    inputUrl: string,
    speed: 1 | SlowMotionSpeed,
    format: ExportFormat = '16:9',
    options: ProcessVideoOptions = {},
  ): Promise<string | null> => {
    console.log('[useSlowMotion] 🎬 Starting video processing with params:', { inputUrl, speed, format, options });
    const { music = 'none', musicVolume = 35, mixWithVideoAudio = false } = options;
    const hasMusic = music !== 'none';
    console.log('[useSlowMotion] 🎵 Music settings:', { hasMusic, music, musicVolume, mixWithVideoAudio });

    cancelledRef.current = false;
    setStatus('loading');
    setProgress(0);
    setErrorMessage('');
    startTimeRef.current = Date.now();

    if (!needsProcessing(speed, format, music)) {
      console.log('[useSlowMotion] ✅ No processing needed, returning input URL directly');
      setProgress(100);
      setStatus('done');
      return inputUrl;
    }

    try {
      let musicStartOffset = 0;
      if (hasMusic) {
        console.log('[useSlowMotion] 🎵 Calculating music start offset...');
        const track = getTrackById(music);
        musicStartOffset = await resolveMusicStartOffset(inputUrl, track.file, track.highlightAt, speed);
        console.log('[useSlowMotion] 🎵 Music start offset:', musicStartOffset, 'seconds');
      }

      let useFFmpeg = false;
      let browserResult: { url: string; blobSize: number } | null = null;
      try {
        console.log('[useSlowMotion] 🌐 Trying browser encoding first...');
      setStatus('processing');
      browserResult = await encodeWithBrowser({
        inputUrl,
        speed,
        format,
        music,
        musicVolume,
        mixWithVideoAudio,
        musicStartOffset,
        onProgress: (p) => {
          // console.log('[useSlowMotion] ⏳ Browser encoding progress:', p + '%');
          if (!cancelledRef.current) setProgress(Math.max(0, Math.min(100, p)));
        },
      });

        if (cancelledRef.current) {
          console.log('[useSlowMotion] ⛔ Processing cancelled');
          setStatus('idle');
          return null;
        }

        // Check if the blob is large enough (at least 10KB)
        if (browserResult.blobSize < 10000) {
          console.warn('[useSlowMotion] ⚠️ Browser encoding produced invalid blob (', browserResult.blobSize, 'bytes), falling back to FFmpeg');
          useFFmpeg = true;
          // Revoke the invalid blob URL
          URL.revokeObjectURL(browserResult.url);
        } else {
          console.log('[useSlowMotion] ✅ Browser encoding successful:', browserResult.url);
          setProgress(100);
          setStatus('done');
          return browserResult.url;
        }
      } catch (err) {
        console.warn('[useSlowMotion] ❌ Browser encoding failed, falling back to FFmpeg:', err);
        useFFmpeg = true;
      }

      console.log('[useSlowMotion] 🎬 Starting FFmpeg encoding...');
      const ff = await getFFmpeg((p) => {
        const clampedProgress = Math.max(0, Math.min(100, p));
        console.log('[useSlowMotion] ⏳ FFmpeg progress:', clampedProgress + '%');
        if (!cancelledRef.current) setProgress(clampedProgress);
      });

      if (cancelledRef.current) {
        console.log('[useSlowMotion] ⛔ Processing cancelled');
        setStatus('idle');
        return null;
      }

      setStatus('processing');

      console.log('[useSlowMotion] 🗑️ Cleaning up old files...');
      await cleanupFiles(ff, ['input.webm', 'output.webm', 'music.mp3']);
      console.log('[useSlowMotion] 📥 Writing input video to FFmpeg...');
      await ff.writeFile('input.webm', await fetchFile(inputUrl));
      console.log('[useSlowMotion] ✅ Input video written');

      if (hasMusic) {
        const track = getTrackById(music);
        console.log('[useSlowMotion] 🎵 Writing music file to FFmpeg...');
        await ff.writeFile('music.mp3', await fetchFile(track.file));
        console.log('[useSlowMotion] ✅ Music file written');
      }

      if (cancelledRef.current) {
        console.log('[useSlowMotion] ⛔ Processing cancelled');
        setStatus('idle');
        return null;
      }

      const musicInputArgs = hasMusic ? buildMusicInputArgs(musicStartOffset) : [];
      console.log('[useSlowMotion] 🎵 Music input args:', musicInputArgs);

      const videoFilters = [
        ...(format !== '16:9' ? [buildCropFilter(format)] : []),
        ...(getSlowMotionVideoFilter(speed) ? [getSlowMotionVideoFilter(speed) as string] : []),
      ];
      const videoFilter = videoFilters.length > 0 ? videoFilters.join(',') : null;
      console.log('[useSlowMotion] 🎬 Video filters:', videoFilter);

      let outputArgs: string[];

      // Shared optimization args for speed
      const optimizeArgs = [
        '-threads', '4',
        '-cpu-used', '4', // Faster encoding
        '-deadline', 'realtime',
      ];

      if (hasMusic && speed === 1 && format === '16:9') {
        outputArgs = [
          '-i', 'input.webm',
          ...musicInputArgs,
          '-filter_complex', buildAudioFilter(musicVolume, mixWithVideoAudio),
          '-map', '0:v:0',
          '-map', '[a]',
          '-c:v', 'copy',
          '-c:a', 'libvorbis',
          '-shortest',
          ...optimizeArgs,
          'output.webm',
        ];
      } else if (hasMusic && speed !== 1 && format === '16:9') {
        const audioTempo = getSlowMotionAudioFilter(speed);
        const vol = (musicVolume / 100).toFixed(2);
        const audioFilter = mixWithVideoAudio
          ? `[1:a]volume=${vol}[bg];[0:a]${audioTempo}[va];[va][bg]amix=inputs=2:duration=first:dropout_transition=2[a]`
          : buildBackgroundMusicFilter(musicVolume);

        outputArgs = [
          '-i', 'input.webm',
          ...musicInputArgs,
          '-filter:v', getSlowMotionVideoFilter(speed) as string,
          '-filter_complex', audioFilter,
          '-map', '0:v:0',
          '-map', '[a]',
          '-c:v', 'libvpx',
          '-b:v', '2M',
          '-c:a', 'libvorbis',
          '-shortest',
          ...optimizeArgs,
          'output.webm',
        ];
      } else if (hasMusic) {
        const audioTempo = speed === 1 ? null : getSlowMotionAudioFilter(speed);
        const vol = (musicVolume / 100).toFixed(2);
        let audioFilter: string;

        if (mixWithVideoAudio) {
          const va = audioTempo ? `[0:a]${audioTempo}[va]` : '[0:a]anull[va]';
          audioFilter = audioTempo
            ? `${va};[1:a]volume=${vol}[bg];[va][bg]amix=inputs=2:duration=first:dropout_transition=2[a]`
            : `[1:a]volume=${vol}[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=2[a]`;
        } else {
          audioFilter = buildBackgroundMusicFilter(musicVolume);
        }

        outputArgs = [
          '-i', 'input.webm',
          ...musicInputArgs,
          '-filter_complex',
          `[0:v]${videoFilter}[v];${audioFilter}`,
          '-map', '[v]',
          '-map', '[a]',
          '-c:v', 'libvpx',
          '-b:v', '2M',
          '-c:a', 'libvorbis',
          '-shortest',
          ...optimizeArgs,
          'output.webm',
        ];
      } else if (speed === 1) {
        outputArgs = [
          '-i', 'input.webm',
          '-vf', buildCropFilter(format),
          '-map', '0:v:0',
          '-map', '0:a?',
          '-c:v', 'libvpx',
          '-b:v', '2M',
          '-c:a', 'copy',
          ...optimizeArgs,
          'output.webm',
        ];
      } else if (format !== '16:9') {
        outputArgs = [
          '-i', 'input.webm',
          '-filter_complex',
          `[0:v]${videoFilter}[v];[0:a]${getSlowMotionAudioFilter(speed)}[a]`,
          '-map', '[v]',
          '-map', '[a]',
          '-c:v', 'libvpx',
          '-b:v', '2M',
          '-c:a', 'libvorbis',
          ...optimizeArgs,
          'output.webm',
        ];
      } else {
        outputArgs = [
          '-i', 'input.webm',
          '-filter:v', getSlowMotionVideoFilter(speed) as string,
          '-filter:a', getSlowMotionAudioFilter(speed),
          '-c:v', 'libvpx',
          '-b:v', '2M',
          '-c:a', 'libvorbis',
          ...optimizeArgs,
          'output.webm',
        ];
      }
      console.log('[useSlowMotion] 🎬 FFmpeg args:', outputArgs);

      const buildVideoOnlySlowMotionArgs = (): string[] => [
        '-i', 'input.webm',
        '-vf', videoFilter ?? (getSlowMotionVideoFilter(speed) as string),
        '-an',
        '-c:v', 'libvpx',
        '-b:v', '2M',
        ...optimizeArgs,
        'output.webm',
      ];

      const buildMusicOnlyArgs = (): string[] => {
        const musicFilter = buildBackgroundMusicFilter(musicVolume);

        if (!videoFilter) {
          return [
            '-i', 'input.webm',
            ...musicInputArgs,
            '-filter_complex', musicFilter,
            '-map', '0:v:0',
            '-map', '[a]',
            '-c:v', 'copy',
            '-c:a', 'libvorbis',
            '-shortest',
            ...optimizeArgs,
            'output.webm',
          ];
        }

        return [
          '-i', 'input.webm',
          ...musicInputArgs,
          '-filter_complex', `[0:v]${videoFilter}[v];${musicFilter}`,
          '-map', '[v]',
          '-map', '[a]',
          '-c:v', 'libvpx',
          '-b:v', '2M',
          '-c:a', 'libvorbis',
          '-shortest',
          ...optimizeArgs,
          'output.webm',
        ];
      };

      try {
        console.log('[useSlowMotion] 🎬 Executing FFmpeg...');
        await ff.exec(outputArgs);
        console.log('[useSlowMotion] ✅ FFmpeg execution complete');
      } catch (execError) {
        if (cancelledRef.current) {
          console.log('[useSlowMotion] ⛔ Processing cancelled');
          setStatus('idle');
          return null;
        }

        const canRetryWithoutSourceAudio = (hasMusic && mixWithVideoAudio) || (!hasMusic && speed !== 1);
        if (!canRetryWithoutSourceAudio) throw execError;

        console.warn('[useSlowMotion] ⚠️ FFmpeg failed with source audio, retrying without:', execError);
        await cleanupFiles(ff, ['output.webm']);
        const retryArgs = hasMusic ? buildMusicOnlyArgs() : buildVideoOnlySlowMotionArgs();
        console.log('[useSlowMotion] 🔄 Retrying with args:', retryArgs);
        await ff.exec(retryArgs);
        console.log('[useSlowMotion] ✅ Retry successful');
      }

      if (cancelledRef.current) {
        console.log('[useSlowMotion] ⛔ Processing cancelled');
        setStatus('idle');
        return null;
      }

      console.log('[useSlowMotion] 📁 Checking for output file...');
      const filesAfter = await ff.listDir('/');
      const outputExists = filesAfter.some((f) => f.name === 'output.webm');
      if (!outputExists) {
        throw new Error('FFmpeg did not create output.webm');
      }
      console.log('[useSlowMotion] ✅ Output file found');

      console.log('[useSlowMotion] 📥 Reading output file...');
      const data = await ff.readFile('output.webm');
      const blob = new Blob([data as any], { type: 'video/webm' });
      console.log('[useSlowMotion] ✅ Blob created:', blob.size, 'bytes');
      const outputUrl = URL.createObjectURL(blob);
      console.log('[useSlowMotion] 🎉 Output URL created:', outputUrl);

      console.log('[useSlowMotion] 🗑️ Cleaning up FFmpeg files...');
      await cleanupFiles(ff, ['input.webm', 'output.webm', 'music.mp3']);

      setProgress(100);
      setStatus('done');
      console.log('[useSlowMotion] 🎉 Processing complete!');
      return outputUrl;
    } catch (err) {
      console.error('[useSlowMotion] ❌ Processing failed:', err);
      if (cancelledRef.current) {
        console.log('[useSlowMotion] ⛔ Processing cancelled');
        setStatus('idle');
        return null;
      }
      setErrorMessage('Le traitement a échoué. Réessayez.');
      setStatus('error');
      resetFFmpeg();
      return null;
    }
  }, []);

  const cancel = useCallback(() => {
    console.log('[useSlowMotion] ⛔ Cancelling processing...');
    cancelledRef.current = true;
    setStatus('idle');
    setProgress(0);
  }, []);

  return { processVideo, status, progress, errorMessage, cancel };
}
