import { useState, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export type SlowMotionSpeed = 0.5 | 0.25;
export type ExportFormat = '16:9' | '9:16' | '1:1';

export type ProcessingStatus = 'idle' | 'loading' | 'processing' | 'done' | 'error';

interface UseSlowMotionReturn {
  processVideo: (inputUrl: string, speed: 1 | SlowMotionSpeed, format?: ExportFormat) => Promise<string | null>;
  status: ProcessingStatus;
  progress: number; // 0–100
  errorMessage: string;
  cancel: () => void;
}

// Singleton FFmpeg instance — reused across calls to avoid reloading WASM each time
let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<void> | null = null;


const FORMAT_RATIOS: Record<ExportFormat, { num: number; den: number }> = {
  '16:9': { num: 16, den: 9 },
  '9:16': { num: 9, den: 16 },
  '1:1': { num: 1, den: 1 },
};

function buildCropFilter(format: ExportFormat): string {
  const { num, den } = FORMAT_RATIOS[format];
  const ratio = num / den;
  
  // Use simpler expressions that FFmpeg can parse
  // If input aspect ratio >= target ratio, crop width; else crop height
  return `crop='if(gte(a,${ratio}),floor(ih*${ratio}/2)*2,iw)':'if(gte(a,${ratio}),ih,floor(iw/${ratio}/2)*2)':(iw-ow)/2:(ih-oh)/2`;
}

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
    }).then(() => undefined);
  }

  await ffmpegLoadPromise;
  return ff;
}

export function useSlowMotion(): UseSlowMotionReturn {
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const cancelledRef = useRef(false);

  const processVideo = useCallback(async (inputUrl: string, speed: 1 | SlowMotionSpeed, format: ExportFormat = '16:9'): Promise<string | null> => {
    cancelledRef.current = false;
    setStatus('loading');
    setProgress(0);
    setErrorMessage('');

    // Si vitesse normale ET format original (16:9), pas besoin de traiter
    // Note: On suppose que la vidéo originale est toujours en 16:9
    if (speed === 1 && format === '16:9') {
      setProgress(100);
      setStatus('done');
      return inputUrl;
    }

    try {
      const ff = await getFFmpeg((p) => {
        if (!cancelledRef.current) setProgress(p);
      });

      if (cancelledRef.current) {
        setStatus('idle');
        return null;
      }

      setStatus('processing');

      // Cleanup any existing files first
      try {
        const files = await ff.listDir('/');
        if (files.some(f => f.name === 'input.webm')) {
          await ff.deleteFile('input.webm');
        }
        if (files.some(f => f.name === 'output.webm')) {
          await ff.deleteFile('output.webm');
        }
      } catch (cleanupErr) {
        // Ignore cleanup errors
      }

      // Write the input video into FFmpeg's virtual filesystem
      await ff.writeFile('input.webm', await fetchFile(inputUrl));

      if (cancelledRef.current) {
        setStatus('idle');
        return null;
      }

      const videoFilters = [
        ...(format !== '16:9' ? [buildCropFilter(format)] : []),
        ...(speed === 1 ? [] : [`setpts=${(1 / speed).toFixed(1)}*PTS`]),
      ];
      const videoFilter = videoFilters.length > 0 ? videoFilters.join(',') : null;

      // Build FFmpeg command based on whether we need slow-motion
      let outputArgs: string[];

      if (speed === 1) {
        // Only crop, no slow-motion
        outputArgs = [
            '-i', 'input.webm',
            '-vf', buildCropFilter(format),
            '-map', '0:v:0',
            '-map', '0:a?',
            '-c:v', 'libvpx',
            '-b:v', '2M',
            '-c:a', 'copy',
            'output.webm',
          ];
      } else {
        // Slow-motion with or without crop
        if (format !== '16:9') {
          // Both crop and slow-motion
          outputArgs = [
            '-i', 'input.webm',
            '-filter_complex',
            `[0:v]${videoFilter}[v];[0:a]${speed === 0.25 ? 'atempo=0.5,atempo=0.5' : `atempo=${speed}`}[a]`,
            '-map', '[v]',
            '-map', '[a]',
            '-c:v', 'libvpx',
            '-b:v', '2M',
            '-c:a', 'libvorbis',
            'output.webm',
          ];
        } else {
          // Only slow-motion
          outputArgs = [
            '-i', 'input.webm',
            '-filter:v', `setpts=${(1 / speed).toFixed(1)}*PTS`,
            '-filter:a', speed === 0.25 ? 'atempo=0.5,atempo=0.5' : `atempo=${speed}`,
            '-c:v', 'libvpx',
            '-b:v', '2M',
            '-c:a', 'libvorbis',
            'output.webm',
          ];
        }
      }

      await ff.exec(outputArgs);

      if (cancelledRef.current) {
        setStatus('idle');
        return null;
      }

      // Check if output file was created
      const filesAfter = await ff.listDir('/');
      const outputExists = filesAfter.some(f => f.name === 'output.webm');
      if (!outputExists) {
        throw new Error('FFmpeg did not create output.webm - encoding may have failed');
      }

      const data = await ff.readFile('output.webm');
      const blob = new Blob([data], { type: 'video/webm' });
      const outputUrl = URL.createObjectURL(blob);

      // Cleanup virtual FS
      try {
        await ff.deleteFile('input.webm');
        await ff.deleteFile('output.webm');
      } catch (cleanupErr) {
        // Ignore cleanup errors
      }

      setProgress(100);
      setStatus('done');
      return outputUrl;

    } catch (err) {
      if (cancelledRef.current) {
        setStatus('idle');
        return null;
      }
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
