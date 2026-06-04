import { useState, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export type SlowMotionSpeed = 0.5 | 0.25;

export type ProcessingStatus = 'idle' | 'loading' | 'processing' | 'done' | 'error';

interface UseSlowMotionReturn {
  processVideo: (inputUrl: string, speed: SlowMotionSpeed) => Promise<string | null>;
  status: ProcessingStatus;
  progress: number; // 0–100
  errorMessage: string;
  cancel: () => void;
}

// Singleton FFmpeg instance — reused across calls to avoid reloading WASM each time
let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<boolean> | null = null;

async function getFFmpeg(onProgress: (p: number) => void): Promise<FFmpeg> {
  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg();
  }

  const ff = ffmpegInstance;

  // Wire up progress reporting
  ff.on('progress', ({ progress }) => {
    onProgress(Math.min(Math.round(progress * 100), 99));
  });

  if (!ffmpegLoadPromise) {
    // Load the WASM core from the official CDN (supports SharedArrayBuffer via COOP/COEP headers)
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    ffmpegLoadPromise = ff.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
  }

  await ffmpegLoadPromise;
  return ff;
}

export function useSlowMotion(): UseSlowMotionReturn {
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const cancelledRef = useRef(false);

  const processVideo = useCallback(async (inputUrl: string, speed: SlowMotionSpeed): Promise<string | null> => {
    cancelledRef.current = false;
    setStatus('loading');
    setProgress(0);
    setErrorMessage('');

    try {
      const ff = await getFFmpeg((p) => {
        if (!cancelledRef.current) setProgress(p);
      });

      if (cancelledRef.current) {
        setStatus('idle');
        return null;
      }

      setStatus('processing');

      // Write the input video into FFmpeg's virtual filesystem
      await ff.writeFile('input.webm', await fetchFile(inputUrl));

      if (cancelledRef.current) {
        setStatus('idle');
        return null;
      }

      // -filter:v setpts — slows down video frames
      // speed 0.5x  → setpts=2.0*PTS  (each frame displayed 2× longer)
      // speed 0.25x → setpts=4.0*PTS
      const ptsMultiplier = (1 / speed).toFixed(1);

      // -filter:a atempo — slows down audio (atempo range: 0.5–2.0 per pass)
      // For 0.25× we need two passes: atempo=0.5,atempo=0.5
      const atempoFilter = speed === 0.25
        ? 'atempo=0.5,atempo=0.5'
        : `atempo=${speed}`;

      await ff.exec([
        '-i', 'input.webm',
        '-filter_complex',
        `[0:v]setpts=${ptsMultiplier}*PTS[v];[0:a]${atempoFilter}[a]`,
        '-map', '[v]',
        '-map', '[a]',
        '-c:v', 'libvpx',
        '-b:v', '2M',
        '-c:a', 'libvorbis',
        'output.webm',
      ]);

      if (cancelledRef.current) {
        setStatus('idle');
        return null;
      }

      const data = await ff.readFile('output.webm');
      const blob = new Blob([data], { type: 'video/webm' });
      const outputUrl = URL.createObjectURL(blob);

      // Cleanup virtual FS
      await ff.deleteFile('input.webm');
      await ff.deleteFile('output.webm');

      setProgress(100);
      setStatus('done');
      return outputUrl;

    } catch (err) {
      if (cancelledRef.current) {
        setStatus('idle');
        return null;
      }
      console.error('[useSlowMotion] FFmpeg error:', err);
      setErrorMessage('Le traitement a échoué. Réessayez.');
      setStatus('error');
      // Reset singleton so next call retries loading
      ffmpegInstance = null;
      ffmpegLoadPromise = null;
      return null;
    }
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    setStatus('idle');
    setProgress(0);
  }, []);

  return { processVideo, status, progress, errorMessage, cancel };
}
